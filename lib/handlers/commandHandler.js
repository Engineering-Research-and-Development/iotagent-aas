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

const async = require('async');
const iotAgentLib = require('iotagent-node-lib');
const iotaUtils = require('../iotaUtils');
const constants = require('../constants');
const transportSelector = require('../transportSelector');
const config = require('../configService');
const context = {
    op: 'IoTAgentAAS.Commands'
};
const metaBindings = require('../metaBindings');

/**
 * Serializes a payload for a command depending on its payloadType if provided
 *
 * @param {String} payload          Payload to serialized
 * @param {Object} command          Command attribute
 * @return {Function}               Returns a serialized payload
 */
function serializedPayloadCommand(payload, command) {
    let serialized;
    if (command && command.payloadType) {
        switch (command.payloadType.toLowerCase()) {
            case 'binaryfromstring':
                serialized = Buffer.from(payload.toString());
                break;
            case 'binaryfromhex':
                serialized = Buffer.from(payload, 'HEX');
                break;
            case 'binaryfromjson': // used by AMQP transport
                serialized = Buffer.from(JSON.stringify(payload));
                break;
            case 'text':
                serialized = payload;
                break;
            case 'json': // passthrough
            default:
                serialized = JSON.stringify(payload);
        }
    } else {
        serialized = JSON.stringify(payload);
    }
    return serialized;
}

/**
 * Generate a function that executes the given command in the device.
 *
 * @param {String} apiKey           APIKey of the device's service or default APIKey.
 * @param {Object} device           Object containing all the information about a device.
 * @param {Object} attribute        Attribute in NGSI format.
 * @return {Function}               Command execution function ready to be called with async.series.
 */
function generateCommandExecution(apiKey, device, group, attribute) {
    let payload = {};
    const command = device && device.commands.find((att) => att.name === attribute.name);

    if (command && command.expression) {
        const parser = iotAgentLib.dataPlugins.expressionTransformation;
        // The context for the JEXL expression should be the ID, TYPE, S, SS
        let attrList = iotAgentLib.dataPlugins.utils.getIdTypeServSubServiceFromDevice(device);
        attrList = device.staticAttributes ? attrList.concat(device.staticAttributes).concat(attribute) : attrList.concat(attribute);
        const ctxt = parser.extractContext(attrList, device);
        // expression result will be the full command payload
        let payloadRes = null;
        try {
            payloadRes = parser.applyExpression(command.expression, ctxt, device);
        } catch (e) {
            // nothing to report
        }
        payload = payloadRes ? payloadRes : command.expression;
    } else {
        payload[attribute.name] = attribute.value;
    }
    if (device.transport === 'AMQP') {
        // to ensure backward compability
        command.payloadType = command.payloadType ? command.payloadType : 'binaryfromjson';
    }
    const serialized = serializedPayloadCommand(payload, command);
    const contentType = command && command.contentType ? command.contentType : 'application/json';
    config.getLogger().debug(context, 'Sending command execution to device %s with apikey %s and payload %j ', device.id, apiKey, payload);
    const executions = transportSelector.createExecutionsForBinding([apiKey, group, device, attribute.name, serialized, contentType], 'executeCommand', device.transport || (group && group.transport ? group.transport : undefined) || config.getConfig().defaultTransport);
    return executions;
}

/**
 * Handles a command execution request coming from the Context Broker. This handler should:
 *  - Identify the device affected by the command.
 *  - Send the command to the appropriate MQTT topic.
 *  - Update the command status in the Context Broker.
 *
 * @param {String} id               ID of the entity for which the command execution was issued.
 * @param {String} type             Type of the entity for which the command execution was issued.
 * @param {String} service          Service ID.
 * @param {String} subservice       Subservice ID.
 * @param {Array} attributes        List of NGSI attributes of type command to execute.
 */
function commandHandler(id, type, service, subservice, attributes, callback) {
    config.getLogger().debug(context, 'Handling command %j for device %s in service %s - %s', attributes, id, service, subservice);

    function concat(previous, current) {
        previous = previous.concat(current);
        return previous;
    }

    iotAgentLib.getDeviceByNameAndType(id, type, service, subservice, function (error, device) {
        if (error) {
            config.getLogger().error(
                context,

                "COMMAND-001: Command execution could not be handled, as device for entity %s %s wasn't found",

                id,
                type
            );
            callback(error);
        } else {
            iotaUtils.getEffectiveApiKey(device.service, device.subservice, device, function (error, apiKey) {
                if (error) {
                    callback(error);
                } else {
                    let group = {};
                    iotAgentLib.getConfigurationSilently(config.getConfig().iota.defaultResource || '', apiKey, function (error, foundGroup) {
                        if (!error) {
                            group = foundGroup;
                        }
                        async.series(attributes.map(generateCommandExecution.bind(null, apiKey, device, group)).reduce(concat, []), callback);
                    });
                }
            });
        }
    });
}

/**
 * Process an update in the state of a command with information coming from the device.
 *
 * @param {String} apiKey           API Key corresponding to the Devices configuration.
 * @param {String} deviceId         Id of the device to be updated.
 * @param {Object} device           Device object containing all the information about a device.
 * @param {Object} messageObj       JSON object sent using MQTT.
 */
function updateCommand(apiKey, deviceId, device, messageObj) {
    const commandList = Object.keys(messageObj);
    const commandUpdates = [];

    for (let i = 0; i < commandList.length; i++) {
        commandUpdates.push(async.apply(iotAgentLib.setCommandResult, device.name, config.getConfig().iota.defaultResource, apiKey, commandList[i], messageObj[commandList[i]], constants.COMMAND_STATUS_COMPLETED, device));
    }

    async.series(commandUpdates, function (error) {
        if (error) {
            config.getLogger().error(
                context,

                "COMMANDS-002: Couldn't update command status in the Context broker " + 'for device %s with apiKey %s: %s',
                device.id,
                apiKey,
                error
            );
        } else {
            config.getLogger().debug(context, 'Single measure for device %s with apiKey %s successfully updated', device.id, apiKey);
        }
    });
}

/**
 * Find the shell ID that contains a specific submodel
 *
 * @param {String} aasEndpoint      AAS server endpoint
 * @param {String} submodelId       Submodel ID to search for
 * @return {String}                 Shell idShort or undefined if not found
 */
async function findShellIdForSubmodel(aasEndpoint, submodelId) {
    try {
        const fetch = require('node-fetch');
        const apiUrl = aasEndpoint + '/shells';

        config.getLogger().debug(context, 'Fetching shells from: %s', apiUrl);

        const response = await fetch(apiUrl);
        const data = await response.json();

        // Iterate through all shells to find which one contains this submodel
        for (const shell of data.result) {
            const shellId = shell.id;
            const shellIdShort = shell.idShort;

            // Fetch submodel refs for this shell
            const submodelRefsResponse = await fetch(`${apiUrl}/${btoa(shellId)}/submodel-refs`);
            const submodelRefsData = await submodelRefsResponse.json();

            // Check if this shell contains our submodel
            for (const submodelRef of submodelRefsData.result) {
                const refSubmodelId = submodelRef.keys[0].value;
                if (refSubmodelId === submodelId) {
                    config.getLogger().debug(context, 'Found shell %s (%s) containing submodel %s', shellIdShort, shellId, submodelId);
                    return shellIdShort;
                }
            }
        }

        config.getLogger().warn(context, 'No shell found containing submodel %s', submodelId);
        return undefined;
    } catch (error) {
        config.getLogger().error(context, 'Error finding shell for submodel %s: %j', submodelId, error);
        return undefined;
    }
}

/**
 * Handle submodel created notification from MQTT
 * Fetches the submodel from AAS server and provisions it dynamically
 *
 * @param {Object} message          MQTT message containing submodel information
 */
async function handleSubmodelCreated(message) {
    config.getLogger().info(context, 'Received submodel created notification: %j', message);

    try {
        const nodesCrawler = require('../mappingTool/nodesCrawler');
        const aasClient = require('../mappingTool/aasClient');

        // Extract submodel ID from message
        let submodelId;
        if (message && message[0] && message[0].id) {
            submodelId = message[0].id;
        } else if (message && message.id) {
            submodelId = message.id;
        } else {
            config.getLogger().error(context, 'Cannot extract submodel ID from message');
            return;
        }

        config.getLogger().info(context, 'Fetching submodel %s from AAS server', submodelId);

        // Fetch the submodel from AAS server
        const aasEndpoint = config.getConfig().aas.endpoint;
        const apiVersion = config.getConfig().aas.api_version;

        let submodel;
        if (apiVersion === 'v1') {
            // For v1, fetch submodel directly
            const fetch = require('node-fetch');
            let apiUrl = aasEndpoint;
            if (!apiUrl.endsWith('/submodels')) {
                apiUrl = apiUrl + '/aas/submodels';
            }
            const response = await fetch(`${apiUrl}/${submodelId}`);
            submodel = await response.json();
        } else {
            // For v2+, fetch using base64 encoded ID
            submodel = await aasClient.fetchSubmodel(aasEndpoint, submodelId);
        }

        config.getLogger().info(context, 'Submodel fetched successfully, starting mapping process');

        // Create a temporary config object for this submodel
        const tempConfig = {
            iota: {
                types: {},
                contexts: [],
                contextSubscriptions: [],
                service: config.getConfig().iota.service,
                subservice: config.getConfig().iota.subservice
            },
            mappingTool: config.getConfig().mappingTool
        };

        // Determine shellId for API v2+
        let shellId;
        if (apiVersion !== 'v1') {
            // For API v2+, we need to find the shell that contains this submodel
            shellId = await findShellIdForSubmodel(aasEndpoint, submodelId);
            config.getLogger().info(context, 'Found shellId: %s for submodel: %s', shellId, submodelId);
        }

        // Process the submodel through the crawler
        await nodesCrawler.nodesCrawler(submodel, tempConfig, shellId);

        config.getLogger().info(context, 'Submodel mapping completed, provisioning device');

        // Get the main config and merge the new types
        const mainConfig = config.getConfig();

        // Merge types
        for (const typeName in tempConfig.iota.types) {
            if (!mainConfig.iota.types[typeName]) {
                mainConfig.iota.types[typeName] = tempConfig.iota.types[typeName];
            }
        }

        // Merge contexts
        mainConfig.iota.contexts = mainConfig.iota.contexts.concat(tempConfig.iota.contexts);

        // Merge context subscriptions
        mainConfig.iota.contextSubscriptions = mainConfig.iota.contextSubscriptions.concat(tempConfig.iota.contextSubscriptions);

        config.setConfig(mainConfig);

        // Provision the device in the IoT Agent
        const contextSub = tempConfig.iota.contextSubscriptions[0];
        const deviceType = tempConfig.iota.types[contextSub.type];

        const effectiveActiveAttributes = metaBindings.getEffectiveAttributes(contextSub.mappings, deviceType.active);
        const effectiveLazyAttributes = metaBindings.getEffectiveAttributes(contextSub.mappings, deviceType.lazy);

        config.getLogger().info(context, 'Effective active attributes: %j', effectiveActiveAttributes);
        config.getLogger().info(context, 'Effective lazy attributes: %j', effectiveLazyAttributes);

        const device = {
            device_id: contextSub.id,
            entity_name: contextSub.id,
            entity_type: contextSub.type,
            apikey: mainConfig.defaultKey,
            service: mainConfig.iota.service,
            subservice: mainConfig.iota.subservice,
            attributes: effectiveActiveAttributes,
            lazy: effectiveLazyAttributes,
            commands: deviceType.commands,
            endpoint: mainConfig.aas.endpoint,
            internal_attributes: {
                contexts: [],
                contextSubscriptions: [contextSub]
            }
        };

        const body = {
            devices: [device]
        };

        config.getLogger().info(context, 'Provisioning device: %j', body);

        // Provision device using HTTP API
        const response = await fetch(`http://localhost:${mainConfig.iota.server.port}/iot/devices`, {
            method: 'POST',
            headers: {
                'fiware-service': mainConfig.iota.service,
                'fiware-servicepath': mainConfig.iota.subservice,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            config.getLogger().info(context, 'Device for submodel %s provisioned successfully', submodelId);

            // Inizializza gli attributi attivi creando l'entità nel Context Broker
            if (effectiveActiveAttributes.length > 0) {
                config.getLogger().info(context, 'Creating entity for device %s with %d active attributes', contextSub.id, effectiveActiveAttributes.length);
                await metaBindings.initActiveAttributes({
                    name: contextSub.id,
                    type: contextSub.type,
                    service: mainConfig.iota.service,
                    subservice: mainConfig.iota.subservice,
                    active: effectiveActiveAttributes
                });
                config.getLogger().info(context, 'Entity created successfully for device %s', contextSub.id);
            } else {
                config.getLogger().warn(context, 'No active attributes found for device %s, entity will not be created', contextSub.id);
            }
        } else {
            const errorText = await response.text();
            config.getLogger().error(context, 'Failed to provision device for submodel %s: %s - %s', submodelId, response.status, errorText);
        }
    } catch (error) {
        config.getLogger().error(context, 'Error handling submodel created notification: %j', error);
    }
}

/**
 * Handle submodel deleted notification from MQTT
 * Removes the device from IoT Agent
 *
 * @param {Object} message          MQTT message containing submodel information
 */
function handleSubmodelDeleted(message) {
    config.getLogger().info(context, 'Received submodel deleted notification: %j', message);
    const urnPrefix = config.getConfig().iota.contextBroker.ngsiVersion === 'ld' ? 'urn:ngsi-ld:' : 'urn:ngsi:';

    try {
        // Extract submodel ID from message
        let submodelId;
        if (message && message[0] && message[0].idShort) {
            submodelId = urnPrefix + message[0].idShort;
        } else if (message && message.idShort) {
            submodelId = urnPrefix + message.idShort;
        } else {
            config.getLogger().error(context, 'Cannot extract submodel ID from message');
            return;
        }

        config.getLogger().info(context, 'Removing device for submodel %s', submodelId);

        // Unregister device directly
        iotAgentLib.unregister(submodelId, config.getConfig().iota.apiKey, config.getConfig().iota.service, config.getConfig().iota.subservice, function (error) {
            if (error) {
                config.getLogger().error(context, 'Error unregistering device for submodel %s: %j', submodelId, error);
            } else {
                config.getLogger().info(context, 'Device for submodel %s removed successfully', submodelId);
            }
        });
    } catch (error) {
        config.getLogger().error(context, 'Error handling submodel deleted notification: %j', error);
    }
}

exports.generateCommandExecution = generateCommandExecution;
exports.updateCommand = updateCommand;
exports.handler = commandHandler;
exports.handleSubmodelCreated = handleSubmodelCreated;
exports.handleSubmodelDeleted = handleSubmodelDeleted;
