/*
 * Copyright 2024 Engineering Ingegneria Informatica S.p.A.
 *
 * This file is part of iotagent-aas
 *
 * iotagent-aas is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-aas is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-aas.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[manfredi.pistone@eng.it, walterdomenico.vergara@eng.it]
 */

const config = require('../configService');
const transportSelector = require('../transportSelector');
const iotAgentLib = require('iotagent-node-lib');
const iotaUtils = require('../iotaUtils');
const async = require('async');
const context = {
    op: 'IoTAgentAAS.QueryHandler'
};
const axios = require('axios');
/**
 * Generate a function that executes the given query in the device.
 *
 * @param {String} apiKey           APIKey of the device's service or default APIKey.
 * @param {Object} device           Object containing all the information about a device.
 * @param {Object} attribute        Attribute in NGSI format.
 * @return {Function}               Query execution function ready to be called with async.series.
 */
function generateQueryExecution(apiKey, device, submodelElements, attribute) {
    config.getLogger().debug(context, 'Sending query execution to device [%s] with apikey [%s] and attribute [%s]', device.id, apiKey, attribute);

    const executions = transportSelector.createExecutionsForBinding([apiKey, device, submodelElements, attribute], 'executeQuery', device.transport || config.getConfig().defaultTransport);

    return executions;
}

/**
 * Handle queries coming to the IoT Agent via de Context Provider API (as a consequence of a query to a passive
 * attribute redirected by the Context Broker).
 *
 * @param {String} id           Entity name of the selected entity in the query.
 * @param {String} type         Type of the entity.
 * @param {Array} attributes    List of attributes to read.
 */
function queryHandler(id, type, service, subservice, attributes, callback) {
    config.getLogger().debug(context, 'Handling query %j for device [%s] in service [%s - %s]', attributes, id, service, subservice);

    function concat(previous, current) {
        previous = previous.concat(current);
        return previous;
    }

    function filterLazy(device, attrs) {
        let lazySet = [];
        if (device.lazy) {
            lazySet = device.lazy;
        } else if (config.getConfig().iota.types[type] && config.getConfig().iota.types[type].lazy) {
            lazySet = config.getConfig().iota.types[type].lazy;
        }

        const lazyAttrs = [];
        attrs.forEach((attr) => {
            const lazyObject = lazySet.find((lazyAttribute) => lazyAttribute.name === attr);
            if (lazyObject) {
                lazyAttrs.push(attr);
            }
        });

        return lazyAttrs;
    }

    async function getSubmodel(device) {
        let foundContext;
        let url;

        for (const context of config.getConfig().iota.contextSubscriptions) {
            if (context.id === device.id) {
                foundContext = context;
                break;
            }
        }

        if (config.getConfig().aas.api_version === 'v1') {
            url = `${device.endpoint}/submodels/${foundContext.submodel_short_id}/submodel/submodelElements`;
        } else {
            url = `${device.endpoint}/submodels/${btoa(device.id)}/submodel-elements`;
        }

        const res = await axios.get(url);
        if (res && res.status === 200) {
            return res.data['result'];
        } else {
            return undefined;
        }
    }

    iotAgentLib.getDeviceByName(id, service, subservice, async function (error, device) {
        if (error) {
            config.getLogger().error(
                context,

                "QUERY-001: Query execution could not be handled, as device for entity [%s] [%s] wasn't found",

                id,
                type
            );
            callback(error);
        } else {
            iotaUtils.getEffectiveApiKey(device.service, device.subservice, device, async function (error, apiKey) {
                if (error) {
                    callback(error);
                } else {
                    const lazyAttributes = filterLazy(device, attributes);
                    let submodelElements = await getSubmodel(device);
                    if (submodelElements === undefined) {
                        throw 'Submodel not found';
                    }
                    const funcList = lazyAttributes.map(generateQueryExecution.bind(null, apiKey, device, submodelElements)).reduce(concat, []);
                    async.series(funcList, function (err, results) {
                        let json_object = {};
                        results.forEach(function (result) {
                            json_object = { ...json_object, ...result };
                        });
                        callback(err, json_object);
                    });
                }
            });
        }
    });
}

exports.handler = queryHandler;
