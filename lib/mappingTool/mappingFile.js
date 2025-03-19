const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const model = mongoose.model;
const config = require('../configService');
const fetch = require('node-fetch');
const con = {
    op: 'IoTAgentAAS.MappingCompare'
};
const metaBindings = require('../metaBindings');

const mappingFileSchema = new Schema({
    _id: {
        type: Schema.Types.String,
        required: true
    },
    types: {
        type: Schema.Types.Mixed,
        required: true
    },
    contexts: {
        type: Schema.Types.Array,
        required: true
    },
    contextSubscriptions: {
        type: Schema.Types.Array,
        required: true
    }
});

const connectionHolder = {};

async function deleteSubmodels(oldMapping, configJson) {
    config.getLogger().info(con, 'Deleting submodels not present on the AAS server anymore');
    for (let context of oldMapping.contextSubscriptions) {
        if (getContext(configJson.iota, context.id) === undefined) {
            deleteSubmodel(configJson, context);
        }
    }
}

function deleteSubmodel(configJson, context) {
    config.getLogger().info(con, `Submodel ${context.id} not found on the AAS server, it will be deleted`);

    fetch(`http://localhost:${configJson.iota.server.port}/iot/devices/${context.id}`, {
        method: 'DELETE',
        headers: {
            'fiware-service': context.service,
            'fiware-servicepath': context.subservice,
            'Content-Type': 'application/json'
        }
    });
}

async function CompareMappings(oldMapping, configJson) {
    config.getLogger().info(con, 'Comparing new mapping and old mapping');
    let submodelsToProvision = [];
    for (let context of configJson.iota.contextSubscriptions) {
        let contextOfOldMapping = getContext(oldMapping, context.id);
        if (contextOfOldMapping != undefined) {
            let oldDeviceConfiguration = await getOldDeviceConfiguration(configJson, contextOfOldMapping);

            let inCommonAttributes = retireveInCommonAttributes(contextOfOldMapping, context);
            let allDeletedAttributes = retireveDeletedAttributes(contextOfOldMapping, context);

            config.getLogger().info(con, `Retrieving deleted active attributes in submodel ${context.id}`);
            let deletedActiveAttributes = retrieveDeviceConfigurationAttributes(allDeletedAttributes, oldDeviceConfiguration);

            config.getLogger().info(con, `Retrieving in common active attributes in submodel ${context.id}`);
            let inCommonActiveAttributes = retrieveDeviceConfigurationAttributes(inCommonAttributes, oldDeviceConfiguration);

            if (inCommonActiveAttributes.length > 0 && configJson.configurationType === 'dynamic') {
                config.getLogger().info(con, `Re-setting active attributes in submodel ${context.id}`);
                setActiveAttributesInNewMapping(configJson, inCommonActiveAttributes, oldDeviceConfiguration);
            }

            if (deletedActiveAttributes.length > 0) {
                await deleteLegacyAttributes(configJson, deletedActiveAttributes, oldDeviceConfiguration);
            }

            let newActiveAttributes = await updateDeviceConfigurationOnAgentAAS(configJson, oldDeviceConfiguration, context);

            if (newActiveAttributes.length > 0) {
                await initNewActiveAttributes(configJson, oldDeviceConfiguration, newActiveAttributes);
            }
        } else {
            submodelsToProvision.push(context);
        }
    }
    for (let newSubmodel of submodelsToProvision) {
        config.getLogger().info(con, `Provisioning new Submodel ${newSubmodel.id}`);
        await provisionNewSubmodelOnAgent(configJson, newSubmodel);
    }
}

async function getOldDeviceConfiguration(configJson, context) {
    let response = await fetch(`http://localhost:${configJson.iota.server.port}/iot/devices/${context.id}`, {
        headers: {
            'fiware-service': context.service,
            'fiware-servicepath': context.subservice,
            'Content-Type': 'application/json'
        }
    });

    let responseJson = await response.json();

    return responseJson;
}

async function provisionNewSubmodelOnAgent(configJson, context) {
    config.getLogger().info(con, `provision of new submodel: ${context.id}`);

    const devices = [];
    const lazyAttributes = metaBindings.getEffectiveAttributes(context.mappings, configJson.iota.types[context.type].lazy);
    const activeAttributes = metaBindings.getEffectiveAttributes(context.mappings, configJson.iota.types[context.type].active);

    const device = {
        device_id: context.id,
        entity_name: context.id,
        entity_type: context.type,
        apikey: configJson.defaultKey,
        service: configJson.iota.service,
        subservice: configJson.iota.subservice,
        attributes: activeAttributes,
        lazy: lazyAttributes,
        commands: configJson.iota.types[context.type].commands,
        endpoint: configJson.aas.endpoint,
        internal_attributes: {
            contexts: [],
            contextSubscriptions: [context]
        }
    };
    devices.push(device);
    const body = {
        devices
    };
    await fetch(`http://localhost:${configJson.iota.server.port}/iot/devices`, {
        method: 'POST',
        headers: {
            'fiware-service': configJson.iota.service,
            'fiware-servicepath': configJson.iota.subservice,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

async function updateDeviceConfigurationOnAgentAAS(configJson, device, context) {
    config.getLogger().info(con, `creating new agent configuration for submodel ${device.entity_name}`);

    const lazyAttributes = metaBindings.getEffectiveAttributes(context.mappings, configJson.iota.types[device.entity_type].lazy);
    const activeAttributes = metaBindings.getEffectiveAttributes(context.mappings, configJson.iota.types[device.entity_type].active);

    const NewDeviceConfiguration = {
        attributes: activeAttributes,
        lazy: lazyAttributes,
        commands: configJson.iota.types[context.type].commands,
        internal_attributes: {
            contexts: [],
            contextSubscriptions: [context]
        }
    };

    config.setConfig(configJson);
    await fetch(`http://localhost:${configJson.iota.server.port}/iot/devices/${device.device_id}`, {
        method: 'PUT',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.service_path,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(NewDeviceConfiguration)
    });

    return getNewActiveAttributes(activeAttributes, device);
}

function getNewActiveAttributes(activeAttributes, device) {
    let newActiveAttributes = [];
    for (let activeAttribute of activeAttributes) {
        if (device.attributes.find((element) => element.name === activeAttribute.name) === undefined) {
            newActiveAttributes.push(activeAttribute);
        }
    }
    return newActiveAttributes;
}

function getContext(targetContexts, id) {
    let targetMapping = undefined;
    for (let mapping of targetContexts.contextSubscriptions) {
        if (mapping.id === id) {
            targetMapping = mapping;
            break;
        }
    }
    return targetMapping;
}

async function deleteLegacyAttributes(configJson, deletedActiveAttributes, device) {
    config.getLogger().info(con, `deleting legacy attributes in submodel ${device.entity_name}`);

    let entity = {
        id: device.entity_name
    };

    for (let deletedActiveAttribute of deletedActiveAttributes) {
        entity[`${deletedActiveAttribute}`] = {};
    }

    const body = {
        actionType: 'delete',
        entities: []
    };

    body.entities.push(entity);

    await fetch(`http://${configJson.iota.contextBroker.host}:${configJson.iota.contextBroker.port}/v2/op/update`, {
        method: 'POST',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.service_path,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

function setActiveAttributesInNewMapping(configJson, inCommonActiveAttributes, device) {
    let type = configJson.iota.types[device.entity_type];
    for (let inCommonActiveAttribute of inCommonActiveAttributes) {
        let i = 0;
        for (let lazyAttribute of type.lazy) {
            if (lazyAttribute.name === inCommonActiveAttribute) {
                configJson.iota.types[device.entity_type].lazy.splice(i, 1);
                configJson.iota.types[device.entity_type].active.push(lazyAttribute);
                break;
            }
            i = i + 1;
        }
    }
}

function retrieveDeviceConfigurationAttributes(mappingAttributes, device) {
    let configurationAttributes = [];

    for (let mappingAttribute of mappingAttributes) {
        for (let activeAttribute of device.attributes) {
            if (activeAttribute.name === mappingAttribute) {
                configurationAttributes.push(activeAttribute.name);
            }
        }
    }

    return configurationAttributes;
}

function retireveDeletedAttributes(contextOfOldMapping, context) {
    config.getLogger().info(con, `Retrieving deleted attributes in submodel ${context.id}`);
    let deletedAttributes = [];
    for (let mappedAttribute of contextOfOldMapping.mappings) {
        if (context.mappings.find((element) => element.ocb_id === mappedAttribute.ocb_id) === undefined) {
            deletedAttributes.push(mappedAttribute.ocb_id);
        }
    }

    return deletedAttributes;
}

function retireveInCommonAttributes(contextOfOldMapping, context) {
    config.getLogger().info(con, `Retrieving in common attributes in submodel ${context.id}`);
    let inCommonAttributes = [];
    for (let mappedAttribute of context.mappings) {
        if (contextOfOldMapping.mappings.find((element) => element.ocb_id === mappedAttribute.ocb_id) != undefined) {
            inCommonAttributes.push(mappedAttribute.ocb_id);
        }
    }

    return inCommonAttributes;
}

async function initNewActiveAttributes(configJSON, device, newAttributes) {
    let service = device.service;
    let servicepath = device.service_path;

    const body = {};

    for (let activeAttribute of newAttributes) {
        body[`${activeAttribute.name}`] = {
            value: '',
            type: activeAttribute.type
        };
    }
    config.getLogger().info(con, `init new attributes in submodel ${device.entity_name}`);
    fetch(`http://${configJSON.iota.contextBroker.host}:${configJSON.iota.contextBroker.port}/v2/entities/${device.entity_name}/attrs`, {
        method: 'PATCH',
        headers: {
            'fiware-service': service,
            'fiware-servicepath': servicepath,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

exports.connectionHolder = connectionHolder;
exports.Schema = mappingFileSchema;
exports.CompareMappings = CompareMappings;
exports.deleteSubmodels = deleteSubmodels;
