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

const iotAgentLib = require('iotagent-node-lib');
const transportSelector = require('./transportSelector');
const commandHandler = require('./handlers/commandHandler');
const queryHandler = require('./handlers/queryHandler');
const iotaUtils = require('./iotaUtils');
const async = require('async');
const errors = require('./errors');
const apply = async.apply;
const context = {
    op: 'IoTAgentAAS.Agent'
};
const config = require('./configService');
const mappingTool = require('./mappingTool/mappingTool');
const metaBindings = require('./metaBindings.js');
const mongoose = require('mongoose');
const mappingFileSchema = require('./mappingTool/mappingFile.js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
/**
 * Handler for incoming notifications for the configuration subscription mechanism.
 *
 * @param {Object} device           Object containing all the device information.
 * @param {Array} updates           List of all the updated attributes.

 */
function configurationNotificationHandler(device, updates, callback) {
    function invokeConfiguration(apiKey, callback) {
        let group = {};
        iotAgentLib.getConfigurationSilently(config.getConfig().iota.defaultResource || '', apiKey, function (error, foundGroup) {
            if (!error) {
                group = foundGroup;
            }

            transportSelector.applyFunctionFromBinding([apiKey, group, device.id, updates], 'sendConfigurationToDevice', device.transport || (group && group.transport ? group.transport : undefined) || config.getConfig().defaultTransport, callback);
        });
    }

    async.waterfall([apply(iotaUtils.getEffectiveApiKey, device.service, device.subservice, device), invokeConfiguration], callback);
}

function configurationHandler(configuration, callback) {
    if (configuration.resource && config.getConfig().iota.iotManager && config.getConfig().iota.defaultResource && configuration.resource !== config.getConfig().iota.defaultResource) {
        callback(new errors.InvalidResource());
    } else {
        callback();
    }
}

/**
 * Handles incoming updateContext requests related with lazy attributes. This handler is still just registered,
 * but empty.
 *
 * @param {String} id               ID of the entity for which the update was issued.
 * @param {String} type             Type of the entity for which the update was issued.
 * @param {Array} attributes        List of NGSI attributes to update.
 */
function updateHandler(id, type, attributes, service, subservice, callback) {
    config.getLogger().debug(context, 'updateHandler');
    callback();
}

/**
 * Calls all the device provisioning handlers for each transport protocol binding whenever a new device is provisioned
 * in the Agent.
 *
 * @param {Object} device           Device provisioning information.
 */
function deviceProvisioningHandler(device, callback) {
    transportSelector.applyFunctionFromBinding([device], 'deviceProvisioningHandler', null, function (error, devices) {
        if (error) {
            callback(error);
        } else {
            const ids = devices.map(({ id }) => id);
            const filtered = devices.filter(({ id }, index) => !ids.includes(id, index + 1));
            let conf = config.getConfig();

            if (conf.configurationType === 'dynamic' || filtered[0].internalAttributes != undefined) {
                for (let device of filtered) {
                    if (!conf.iota.types.hasOwnProperty(`${device.type}`)) {
                        config.getLogger().info(context, `Creating new Type ${device.type} for mapping`);
                        createNewType(device, conf);
                    } else {
                        config.getLogger().info(context, `Appending new attributes to Type ${device.type}`);
                        appendTypeAttributesAndCommands(device, conf);
                        updateType(conf, device);
                    }

                    device.internalAttributes.contextSubscriptions[0].service = device.service;
                    device.internalAttributes.contextSubscriptions[0].subservice = device.subservice;

                    conf.iota.contexts = conf.iota.contexts.concat(device.internalAttributes.contexts);
                    updateContextSubscriptions(conf, device.internalAttributes.contextSubscriptions[0]);
                    config.setConfig(conf);
                    metaBindings.initActiveAttributes(device);
                }
                saveMappingFile(config.getConfig());
            }
            callback(null, filtered[0]);
        }
    });
}

/**
 * Calls all the device updating handlers for each transport protocol binding whenever a new device is updated
 * in the Agent.
 *
 * @param {Object} device           Device updating information.
 */
function deviceUpdatingHandler(newDevice, oldDevice, callback) {
    transportSelector.applyFunctionFromBinding([newDevice], 'deviceUpdateHandler', null, function (error, devices) {
        if (error) {
            callback(error);
        } else {
            let conf = config.getConfig();
            if (newDevice.internalAttributes != undefined) {
                updateType(conf, newDevice);
                newDevice.internalAttributes.contextSubscriptions[0].service = newDevice.service;
                newDevice.internalAttributes.contextSubscriptions[0].subservice = newDevice.subservice;
                updateContextSubscriptions(conf, newDevice.internalAttributes.contextSubscriptions[0]);
                config.setConfig(conf);
                saveMappingFile(config.getConfig());
                ActiveToLazyAttributeSetting(conf, newDevice, oldDevice);
            }
            callback(null, newDevice);
        }
    });
}

function ActiveToLazyAttributeSetting(configJson, newDevice, oldDevice) {
    let ActiveToLazyAttributes = getAttributesChangedToLazy(newDevice, oldDevice);

    if (ActiveToLazyAttributes.length > 0) {
        let entity = {
            id: newDevice.name
        };

        for (let ActiveToLazyAttribute of ActiveToLazyAttributes) {
            entity[`${ActiveToLazyAttribute.name}`] = {};
        }

        const body = {
            actionType: 'delete',
            entities: []
        };

        body.entities.push(entity);

        fetch(`http://${configJson.iota.contextBroker.host}:${configJson.iota.contextBroker.port}/v2/op/update`, {
            method: 'POST',
            headers: {
                'fiware-service': newDevice.service,
                'fiware-servicepath': newDevice.subservice,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
    }
}

function getAttributesChangedToLazy(newDevice, oldDevice) {
    let ActiveToLazyAttribute = [];
    for (let lazyAttribute of newDevice.lazy) {
        let activeAttribute = oldDevice.active.find((activeAttribute) => lazyAttribute.name === activeAttribute.name);
        if (activeAttribute != undefined) {
            ActiveToLazyAttribute.push(activeAttribute);
        }
    }

    return ActiveToLazyAttribute;
}

function deleteSubmodelFromContextBroker(configJson, device) {
    fetch(`http://${configJson.iota.contextBroker.host}:${configJson.iota.contextBroker.port}/v2/entities/${device.name}`, {
        method: 'DELETE',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.subservice
        }
    })
        .then(function (response) {
            config.getLogger().info(context, `Submodel ${device.name} deleted from context broker`);
        })
        .catch(function (err) {
            config.getLogger().error(err);
        });
}

function deviceRemoveHandler(device, callback) {
    transportSelector.applyFunctionFromBinding([device], 'deviceRemoveHandler', null, function (error, devices) {
        if (error) {
            callback(error);
        } else {
            let conf = config.getConfig();
            deleteContextSubscriptions(conf, device);
            config.setConfig(conf);
            saveMappingFile(config.getConfig());
            deleteSubmodelFromContextBroker(conf, device);
            callback(null, device);
        }
    });
}

function updateType(configJson, device) {
    for (let activeAttribute of device.active) {
        let i = 0;
        for (let lazyAttribute of configJson.iota.types[device.type].lazy) {
            if (lazyAttribute.name === activeAttribute.name) {
                configJson.iota.types[device.type].lazy.splice(i, 1);
                configJson.iota.types[device.type].active.push(lazyAttribute);
                break;
            }
            i = i + 1;
        }
    }

    for (let lazyAttribute of device.lazy) {
        let i = 0;
        for (let activeAttribute of configJson.iota.types[device.type].active) {
            if (lazyAttribute.name === activeAttribute.name) {
                configJson.iota.types[device.type].active.splice(i, 1);
                configJson.iota.types[device.type].lazy.push(lazyAttribute);
                break;
            }
            i = i + 1;
        }
    }
}

function deleteContextSubscriptions(configJson, device) {
    let i = 0;
    for (let context of configJson.iota.contextSubscriptions) {
        if (context.id === device.id) {
            configJson.iota.contextSubscriptions.splice(i, 1);
            break;
        }
        i = i + 1;
    }
}

function updateContextSubscriptions(configJson, deviceContext) {
    let i = 0;
    let found = false;
    for (let context of configJson.iota.contextSubscriptions) {
        if (context.id === deviceContext.id) {
            configJson.iota.contextSubscriptions[i] = deviceContext;
            found = true;
            break;
        }
        i = i + 1;
    }
    if (!found) {
        configJson.iota.contextSubscriptions = configJson.iota.contextSubscriptions.concat([deviceContext]);
    }
}

/**
 * Starts the IOTA with the given configuration.
 *
 * @param {Object} newConfig        New configuration object.
 */
async function start(newConfig, callback) {
    config.setLogger(iotAgentLib.logModule);
    config.setConfig(newConfig);

    if (config.getConfig().configurationType === 'auto') {
        config.getLogger().info('----------------    MAPPING TOOL    ----------------');
        const configJS = await mappingTool.mappingTool(config.getConfig());
        config.getConfig().iota.types = configJS.types;
        config.getConfig().iota.contexts = configJS.contexts;
        config.getConfig().iota.contextSubscriptions = configJS.contextSubscriptions;
    }

    iotAgentLib.activate(config.getConfig().iota, function (error) {
        if (error) {
            callback(error);
        } else {
            config.getLogger().info(context, 'IoT Agent services activated');
            //append config JEXL transformation to built in transformations
            iotAgentLib.dataPlugins.expressionTransformation.setJEXLTransforms(newConfig.jexlTransformations);

            iotAgentLib.setConfigurationHandler(configurationHandler);
            iotAgentLib.setCommandHandler(commandHandler.handler);
            iotAgentLib.setProvisioningHandler(deviceProvisioningHandler);
            iotAgentLib.setUpdatingHandler(deviceUpdatingHandler);
            iotAgentLib.setRemoveDeviceHandler(deviceRemoveHandler);
            iotAgentLib.setDataUpdateHandler(updateHandler);
            iotAgentLib.setDataQueryHandler(queryHandler.handler);
            //Aggiungere la funzione che gestisce correttamente l'eliminazione del device
            if (config.getConfig().configRetrieval) {
                iotAgentLib.setNotificationHandler(configurationNotificationHandler);
            }

            transportSelector.startTransportBindings(newConfig, callback);
        }
    });
}

async function saveMappingFile(configFile) {
    if (!mappingFileSchema.connectionHolder.hasOwnProperty('connection')) {
        mappingFileSchema.connectionHolder.connection = await mongoose.createConnection(`mongodb://${configFile.iota.mongodb.host}:${configFile.iota.mongodb.port}/${configFile.iota.mongodb.db}`);
        mappingFileSchema.connectionHolder.model = mappingFileSchema.connectionHolder.connection.model('mappingFiles', mappingFileSchema.Schema);
    }

    const mappingJson = {
        types: configFile.iota.types,
        contexts: configFile.iota.contexts,
        contextSubscriptions: configFile.iota.contextSubscriptions
    };

    saveMappingLocalCopy(mappingJson);
    await saveMappingOnMongoDB(configFile);
}

function saveMappingLocalCopy(mappingJson) {
    const configFolder = path.join(process.cwd(), '/conf');
    const configFile = path.join(configFolder, 'config_mapping_tool.json');
    fs.writeFile(configFile, JSON.stringify(mappingJson, null, 4), 'utf8', function (err) {
        if (err) {
            config.getLogger().warn('An error occured while saving config_mapping_tool.json');
            return;
        }
        config.getLogger().info('config_mapping_tool.json has been saved successfully.');
    });
}

async function saveMappingOnMongoDB(configFile) {
    let queryResult = await mappingFileSchema.connectionHolder.model.find({ _id: 'mappingFile' }).exec();
    if (queryResult.length == 0) {
        try {
            const mappingFile = await mappingFileSchema.connectionHolder.model.create({
                _id: 'mappingFile',
                types: configFile.iota.types,
                contexts: configFile.iota.contexts,
                contextSubscriptions: configFile.iota.contextSubscriptions
            });
            await mappingFile.save();
            config.getLogger().info('config_mapping_tool.json has been created successfully on mongoDB');
        } catch (e) {
            config.getLogger().error('error during config_mapping_tool.json creation on mongoDB');
            config.getLogger().error(e);
        }
    } else {
        let mappingFile = queryResult[0];
        mappingFile.types = configFile.iota.types;
        mappingFile.contexts = configFile.iota.contexts;
        mappingFile.contextSubscriptions = configFile.iota.contextSubscriptions;
        try {
            await mappingFile.save();
            config.getLogger().info('config_mapping_tool.json has been updated successfully on mongoDB');
        } catch (e) {
            config.getLogger().error('error during config_mapping_tool.json update on mongoDB');
        }
    }
}

/**
 * Stops the current IoT Agent.
 *
 */
function stop(callback) {
    config.getLogger().info(context, 'Stopping IoT Agent');
    async.series([transportSelector.stopTransportBindings, iotAgentLib.resetMiddlewares, iotAgentLib.deactivate], callback);
}

/**
 * Shuts down the IoT Agent in a graceful manner
 *
 */
function handleShutdown(signal) {
    config.getLogger().info(context, 'Received %s, starting shutdown processs', signal);
    stop((err) => {
        if (err) {
            config.getLogger().error(context, err);
            return process.exit(1);
        }
        return process.exit(0);
    });
}

function createNewType(device, conf) {
    conf.iota.types[`${device.type}`] = {
        active: device.active,
        lazy: device.lazy,
        commands: device.commands
    };

    config.getLogger().info(context, `New Type ${device.type} created`);
}

function appendTypeAttributesAndCommands(device, conf) {
    conf.iota.types[`${device.type}`].active.concat(appendAttributes(device.active, conf.iota.types[`${device.type}`].active));
    conf.iota.types[`${device.type}`].lazy.concat(appendAttributes(device.lazy, conf.iota.types[`${device.type}`].lazy));

    let DeviceCommands = device.commands;
    let confTypeCommands = conf.iota.types[`${device.type}`].commands;

    for (let deviceCommand of DeviceCommands) {
        if (confTypeCommands.indexOf(deviceCommand) === -1) {
            conf.iota.types[`${device.type}`].commands.push(deviceCommand);
        }
    }
}

function appendAttributes(deviceAttributes, confAttributes) {
    let newAttributes = [];
    for (let deviceAttribute of deviceAttributes) {
        if (confAttributes.indexOf(deviceAttribute) === -1) {
            newAttributes.push(deviceAttribute);
        }
    }
    return newAttributes;
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('SIGHUP', handleShutdown);

exports.start = start;
exports.stop = stop;
