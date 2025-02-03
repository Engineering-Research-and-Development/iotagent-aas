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
        type: Schema.Types.ObjectId,
        auto: true
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

async function CompareMappings(oldMapping, configJson) {
    config.getLogger().info(con, 'Comparing new mapping and old mapping');
    let submodelsToProvision = [];
    for (let context of configJson.iota.contextSubscriptions) {
        let contextOfOldMapping = getOldMappingContext(oldMapping, context.id);
        if (contextOfOldMapping != undefined) {
            let oldDeviceConfiguration = await getOldDeviceConfiguration(configJson, contextOfOldMapping);

            //let newAttributes = retireveNewAttributes(contextOfOldMapping, context);
            let inCommonAttributes = retireveInCommonAttributes(contextOfOldMapping, context);
            let allDeletedAttributes = retireveDeletedAttributes(contextOfOldMapping, context);

            config.getLogger().info(con, `Retrieving deleted active attributes in submodel ${context.id}`);
            let deletedActiveAttributes = retrieveDeviceConfigurationAttributes(allDeletedAttributes, oldDeviceConfiguration);

            config.getLogger().info(con, `Retrieving in common active attributes in submodel ${context.id}`);
            let inCommonActiveAttributes = retrieveDeviceConfigurationAttributes(inCommonAttributes, oldDeviceConfiguration);

            let inCommonActiveAttributeswithValues;
            if (inCommonActiveAttributes.length > 0) {
                config.getLogger().info(con, `Re-setting active attributes in submodel ${context.id}`);
                setActiveAttributesInNewMapping(configJson, inCommonActiveAttributes, oldDeviceConfiguration);
                inCommonActiveAttributeswithValues = await getInCommonActiveAttributesValues(configJson, inCommonActiveAttributes, oldDeviceConfiguration);
            } else {
                inCommonActiveAttributeswithValues = {};
            }

            if (deletedActiveAttributes.length > 0) {
                let legacyAttributes = await createLegacyAttributesObject(configJson, deletedActiveAttributes, oldDeviceConfiguration);
            }

            await updateDeviceConfigurationOnAgentAAS(configJson, oldDeviceConfiguration, context);
            //await sendLegacyAttributesToContextBroker(configJson, legacyAttributes, oldDeviceConfiguration);
            await sendActiveAttributesValuesToContextBroker(configJson, inCommonActiveAttributeswithValues, oldDeviceConfiguration);
        } else {
            submodelsToProvision.push(context);
        }
    }
    for (let newSubmodel of submodelsToProvision) {
        config.getLogger().info(con, `Provisioning new Submodel ${newSubmodel.id}`);
        await provisionNewSubmodelOnAgent(configJson, newSubmodel);
    }

    //deleteNewSubmodels(configJson, submodelsToDelete);
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

async function sendActiveAttributesValuesToContextBroker(configJson, inCommonActiveAttributeswithValues, device) {
    if (Object.keys(inCommonActiveAttributeswithValues).length === 0) {
        return;
    }
    config.getLogger().info(con, `sending active attributes data to Context Broker for submodel ${device.entity_name}`);
    const bodyForInCommonAttributes = {};

    for (let inCommonAttribute in inCommonActiveAttributeswithValues) {
        bodyForInCommonAttributes[`${inCommonAttribute}`] = inCommonActiveAttributeswithValues[`${inCommonAttribute}`];
    }

    fetch(`http://${configJson.iota.contextBroker.host}:${configJson.iota.contextBroker.port}/v2/entities/${device.entity_name}/attrs`, {
        method: 'PATCH',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.service_path,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyForInCommonAttributes)
    });
}

async function sendLegacyAttributesToContextBroker(configJson, legacyAttributes, device) {
    if (Object.keys(legacyAttributes).length === 0) {
        return;
    }
    config.getLogger().info(con, `sending legacy data to Context Broker for submodel ${device.entity_name}`);
    const bodyForLegacyAttributes = {
        previousModelVersionAttributes: {
            type: 'StructuredValue',
            value: {}
        }
    };

    for (let legacyattribute in legacyAttributes) {
        bodyForLegacyAttributes.previousModelVersionAttributes.value[`${legacyattribute}`] = legacyAttributes[`${legacyattribute}`];
    }

    fetch(`http://${configJson.iota.contextBroker.host}:${configJson.iota.contextBroker.port}/v2/entities/${device.entity_name}/attrs`, {
        method: 'POST',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.service_path,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyForLegacyAttributes)
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
}

async function getInCommonActiveAttributesValues(configJson, inCommonActiveAttributes, device) {
    config.getLogger().info(con, `retrieving active attributes values in submodel ${device.entity_name}`);

    let inCommonActiveAttributesValues = {};

    let response = await fetch(`http://${configJson.iota.contextBroker.host}:${configJson.iota.contextBroker.port}/v2/entities/${device.entity_name}`, {
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.service_path
        }
    });

    let responseJson = await response.json();

    for (let inCommonActiveAttribute of inCommonActiveAttributes) {
        inCommonActiveAttributesValues[`${inCommonActiveAttribute}`] = responseJson[`${inCommonActiveAttribute}`];
    }

    return inCommonActiveAttributesValues;
}

function deleteNewSubmodels(configJson, submodelsToDelete) {
    config.getLogger().info(con, `deleting new Submodel`);
    for (let id of submodelsToDelete) {
        let i = 0;
        for (let context of configJson.iota.contextSubscriptions) {
            if (context.id === id) {
                configJson.iota.contextSubscriptions.splice(i, 1);
                break;
            }
            i = i + 1;
        }
    }
}
//ATTENZIONE: per la gestione di più server aas contemporaneamente, verificare se è necessario controllare anche altre informazioni oltre l'id
function getOldMappingContext(oldMappings, id) {
    let oldMapping = undefined;
    for (let mapping of oldMappings.contextSubscriptions) {
        if (mapping.id === id) {
            oldMapping = mapping;
            break;
        }
    }
    return oldMapping;
}

async function createLegacyAttributesObject(configJson, deletedActiveAttributes, device) {
    config.getLogger().info(con, `retrieving legacy attributes in submodel ${device.entity_name}`);
    let legacyAttributes = {};

    let response = await fetch(`http://${configJson.iota.contextBroker.host}:${configJson.iota.contextBroker.port}/v2/entities/${device.entity_name}`, {
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.service_path
        }
    });

    let responseJson = await response.json();

    let entities = {
        id: device.entity_name
    };

    for (let deletedActiveAttribute of deletedActiveAttributes) {
        legacyAttributes[`${deletedActiveAttribute}`] = responseJson[`${deletedActiveAttribute}`].value;
        entities[`${deletedActiveAttribute}`] = {};
    }

    const body = {
        actionType: 'delete',
        entities: []
    };
    body.entities.push(entities);

    config.getLogger().info(con, `deleting legacy attributes in submodel ${device.entity_name}`);
    await fetch(`http://${configJson.iota.contextBroker.host}:${configJson.iota.contextBroker.port}/v2/op/update`, {
        method: 'POST',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.service_path,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    return legacyAttributes;
}

function setActiveAttributesInNewMapping(configJson, inCommonActiveAttributes, device) {
    let type = configJson.iota.types[device.entity_type];
    for (let inCommonActiveAttribute of inCommonActiveAttributes) {
        let i = 0;
        for (let lazyAttribute of type.lazy) {
            if (lazyAttribute.name === inCommonActiveAttribute) {
                configJson.iota.types[device.entity_type].lazy.splice(i, 1);
                configJson.iota.types[device.entity_type].active.push(lazyAttribute);

                //config.getConfig().iota.types[device.entity_type].lazy.splice(i, 1);
                //config.getConfig().iota.types[device.entity_type].active.push(lazyAttribute);
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
        let attributeFound = checkIfAttributeExist(mappedAttribute.ocb_id, context);
        if (!attributeFound) {
            deletedAttributes.push(mappedAttribute.ocb_id);
        }
    }

    return deletedAttributes;
}

function retireveNewAttributes(contextOfOldMapping, context) {
    config.getLogger().info(con, `Retrieving new attributes in submodel ${context.id}`);
    let newAttributes = [];
    for (let mappedAttribute of context.mappings) {
        let attributeFound = checkIfAttributeExist(mappedAttribute.ocb_id, contextOfOldMapping);
        if (!attributeFound) {
            newAttributes.push(mappedAttribute.ocb_id);
        }
    }

    return newAttributes;
}

function retireveInCommonAttributes(contextOfOldMapping, context) {
    config.getLogger().info(con, `Retrieving in common attributes in submodel ${context.id}`);
    let inCommonAttributes = [];
    for (let mappedAttribute of context.mappings) {
        let attributeFound = checkIfAttributeExist(mappedAttribute.ocb_id, contextOfOldMapping);
        if (attributeFound) {
            inCommonAttributes.push(mappedAttribute.ocb_id);
        }
    }

    return inCommonAttributes;
}

function checkIfAttributeExist(mappedAttributeName, context) {
    for (let mappedAttribute of context.mappings) {
        if (mappedAttribute.ocb_id === mappedAttributeName) {
            return true;
        }
    }

    return false;
}

exports.connectionHolder = connectionHolder;
exports.Schema = mappingFileSchema;
exports.CompareMappings = CompareMappings;
