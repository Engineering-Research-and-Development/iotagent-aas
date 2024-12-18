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
                    }
                    conf.iota.contexts = conf.iota.contexts.concat(device.internalAttributes.contexts);
                    conf.iota.contextSubscriptions = conf.iota.contextSubscriptions.concat(device.internalAttributes.contextSubscriptions);
                    config.setConfig(conf);
                    metaBindings.sendEmptyData(device.internalAttributes.contextSubscriptions[0], device);
                }
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
function deviceUpdatingHandler(device, callback) {
    transportSelector.applyFunctionFromBinding([device], 'deviceUpdatingHandler', null, function (error, devices) {
        if (error) {
            callback(error);
        } else {
            callback(null, devices[0]);
        }
    });
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
            iotAgentLib.setDataUpdateHandler(updateHandler);
            iotAgentLib.setDataQueryHandler(queryHandler.handler);

            if (config.getConfig().configRetrieval) {
                iotAgentLib.setNotificationHandler(configurationNotificationHandler);
            }

            transportSelector.startTransportBindings(newConfig, callback);
        }
    });
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
