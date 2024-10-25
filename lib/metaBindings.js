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

const config = require('./configService');
const http = require('http');
const context = {
    op: 'IoTAgentAAS.MetaBindings'
};
const url = require('url');

/**
 * Create the mongo group if not existing, using config.js information
 */
function createGroup() {
    return new Promise((resolve, reject) => {
        const body = {
            services: [
                {
                    apikey: config.getConfig().defaultKey,
                    cbroker: `http://${config.getConfig().iota.contextBroker.host}:${config.getConfig().iota.contextBroker.port}`,
                    entity_type: config.getConfig().iota.defaultType,
                    resource: config.getConfig().iota.defaultResource
                }
            ]
        };
        const q = url.parse(`http://localhost:${config.getConfig().iota.server.port}`, true);
        const options = {
            host: q.hostname,
            port: q.port,
            path: '/iot/services',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'fiware-service': config.getConfig().iota.service,
                'fiware-servicepath': config.getConfig().iota.subservice
            }
        };
        httpRequest(options, body)
            .then(function () {
                resolve(true);
            })
            .catch(function (err) {
                // http code 409 = Resource already exists
                if (err.message.includes('statusCode=409')) {
                    resolve(true);
                } else {
                    reject(err);
                }
            });
    });
}

function getEffectiveAttributes(mappingAttributes, typeAttributes) {
    const effectiveAttributes = [];

    for (const typeAttribute of typeAttributes) {
        for (const mappedAttribute of mappingAttributes) {
            if (typeAttribute.name === mappedAttribute.ocb_id) {
                effectiveAttributes.push(typeAttribute);
            }
        }
    }

    return effectiveAttributes;
}

/**
 * Create the device if not existing, using config.js information
 */
function createDevices() {
    return new Promise((resolve, reject) => {
        const devices = [];
        const contextSubscriptions = config.getConfig().iota.contextSubscriptions;
        for (const context of contextSubscriptions) {
            const lazyAttributes = getEffectiveAttributes(context.mappings, config.getConfig().iota.types[context.type].lazy);
            const activeAttributes = getEffectiveAttributes(context.mappings, config.getConfig().iota.types[context.type].active);

            const device = {
                device_id: context.id,
                entity_name: context.id,
                entity_type: context.type,
                apikey: config.getConfig().defaultKey,
                service: config.getConfig().iota.service,
                subservice: config.getConfig().iota.subservice,
                attributes: activeAttributes,
                lazy: lazyAttributes,
                commands: config.getConfig().iota.types[context.type].commands, //ATTENZIONE: la situazione in cui ci sono submodel dello stesso tipo ma con comandi diversi potrebbe dare problemi
                endpoint: config.getConfig().aas.endpoint
            };
            devices.push(device);
        }

        const body = {
            devices
        };
        const q = url.parse(`http://localhost:${config.getConfig().iota.server.port}`, true);
        const options = {
            host: q.hostname,
            port: q.port,
            path: '/iot/devices',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'fiware-service': config.getConfig().iota.service,
                'fiware-servicepath': config.getConfig().iota.subservice
            }
        };
        httpRequest(options, body)
            .then(function () {
                resolve(true);
            })
            .catch(function (err) {
                // http code 409 = Resource already exists
                if (err.message.includes('statusCode=409')) {
                    resolve(true);
                } else {
                    /* istanbul ignore next */
                    reject(err);
                }
            });
    });
}

function httpRequest(options, postData) {
    return new Promise(function (resolve, reject) {
        // eslint-disable-next-line consistent-return
        const req = http.request(options, function (res) {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error('statusCode=' + res.statusCode));
            }
            let body = [];
            res.on('data', function (chunk) {
                body.push(chunk);
            });
            res.on('end', function () {
                try {
                    body = JSON.parse(Buffer.concat(body).toString());
                } catch (e) {
                    /* istanbul ignore next */
                    reject(e);
                }
                resolve(body);
            });
        });
        req.on('error', function (err) {
            reject(err);
        });
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
}

/**
 * Perform provisioning of Group and Device
 */
async function performProvisioning() {
    const createGroupResult = await createGroup();
    const createDevicesResult = await createDevices();

    if (createGroupResult !== true) {
        config.getLogger().error(context, 'GLOBAL: Error on group provisioning.');
        throw new Error(createGroupResult);
    }

    if (createDevicesResult !== true) {
        config.getLogger().error(context, 'GLOBAL: Error on devices provisioning.');
        throw new Error(createDevicesResult);
    }
}

async function initProvisioning() {
    try {
        if (config.getConfig().configurationType === 'auto' || config.getConfig().configurationType === 'static') {
            await performProvisioning();
        }
    } catch (err) {
        /* istanbul ignore next */
        throw new Error(err);
    }
}

exports.initProvisioning = initProvisioning;
