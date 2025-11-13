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
const fetch = require('node-fetch');
const http = require('http');
const context = {
    op: 'IoTAgentAAS.MetaBindings'
};
const url = require('url');
const mongoose = require('mongoose');
const mappingFileSchema = require('./mappingTool/mappingFile.js');
const mappingTool = require('./mappingTool/mappingTool.js');
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
            //ATTENZIONE: Non si possono avere 2 submodel dello stesso tipo con configurazioni diverse tra active e lazy
            const device = {
                device_id: context.id,
                entity_name: context.id,
                entity_type: context.type,
                apikey: config.getConfig().defaultKey,
                service: config.getConfig().iota.service,
                subservice: config.getConfig().iota.subservice,
                attributes: activeAttributes,
                lazy: lazyAttributes,
                internal_attributes: {
                    contexts: [],
                    contextSubscriptions: [context]
                },
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
            let mappingFile = await getMappingFileFromMongo(config.getConfig());
            if (mappingFile != undefined && config.getConfig().configurationType === 'auto') {
                config.getLogger().info('----------------    MAPPING COMPARE   ----------------');
                await mappingFileSchema.CompareMappings(mappingFile, config.getConfig());
                await mappingFileSchema.deleteSubmodels(mappingFile, config.getConfig());
            } else {
                await performProvisioning();
            }
        } else {
            let mappingFile = await getMappingFileFromMongo(config.getConfig());
            if (config.getConfig().configurationType === 'dynamic' && mappingFile != undefined) {
                config.getLogger().info('----------------    MAPPING COMPARE   ----------------');
                const configJS = await mappingTool.mappingTool(config.getConfig());
                config.getConfig().iota.types = configJS.types;
                config.getConfig().iota.contexts = configJS.contexts;
                config.getConfig().iota.contextSubscriptions = configJS.contextSubscriptions;
                await mappingFileSchema.CompareMappings(mappingFile, config.getConfig());
                await mappingFileSchema.deleteSubmodels(mappingFile, config.getConfig());
            }
        }
    } catch (err) {
        /* istanbul ignore next */
        throw new Error(err);
    }
}

async function getMappingFileFromMongo(configFile) {
    let connection = await mongoose.createConnection(`mongodb://${configFile.iota.mongodb.host}:${configFile.iota.mongodb.port}/${configFile.iota.mongodb.db}`);
    const model = connection.model('mappingFiles', mappingFileSchema.Schema);
    let queryResult = await model.find({ _id: 'mappingFile' });
    connection.close();
    if (queryResult.length == 0) {
        return undefined;
    } else {
        return queryResult[0];
    }
}

function initActiveAttributes(device) {
    return new Promise((resolve, reject) => {
        const conf = config.getConfig();

        const service = device.service;
        const servicepath = device.subservice;
        const ngsiVersion = conf.iota.contextBroker.ngsiVersion || 'v2';

        let url;
        let headers;
        let body;

        if (ngsiVersion === 'ld') {
            // NGSI-LD format
            url = `http://${conf.iota.contextBroker.host}:${conf.iota.contextBroker.port}/ngsi-ld/v1/entities`;
            
            body = {
                id: device.name,
                type: device.type
            };

            for (const activeAttribute of device.active) {
                body[`${activeAttribute.name}`] = {
                    type: 'Property',
                    value: ''
                };
            }

            headers = {
                'NGSILD-Tenant': service,
                'NGSILD-Path': servicepath,
                'Content-Type': 'application/json',
                Link: `<${conf.iota.contextBroker.jsonLdContext}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`
            };
        } else {
            // NGSIv2 format
            url = `http://${conf.iota.contextBroker.host}:${conf.iota.contextBroker.port}/v2/entities`;
            
            body = {
                id: device.name,
                type: device.type
            };

            for (const activeAttribute of device.active) {
                body[`${activeAttribute.name}`] = {
                    value: '',
                    type: 'Text'
                };
            }

            headers = {
                'fiware-service': service,
                'fiware-servicepath': servicepath,
                'Content-Type': 'application/json'
            };
        }

        fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        })
            .then(function () {
                resolve(true);
            })
            .catch(function (err) {
                // http code 409 = Resource already exists
                if (err.message.includes('statusCode=409') || err.message.includes('409')) {
                    resolve(true);
                } else {
                    /* istanbul ignore next */
                    reject(err);
                }
            });
    });
}

exports.initProvisioning = initProvisioning;
exports.initActiveAttributes = initActiveAttributes;
exports.getEffectiveAttributes = getEffectiveAttributes;
