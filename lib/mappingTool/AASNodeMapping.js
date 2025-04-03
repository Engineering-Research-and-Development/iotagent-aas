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

/* eslint-disable no-unused-vars */

const extract = require('./extractNodeInformation');
const config = require('../configService');

function AASNodeMapping(types, configJson, nodeName, submodelIdShort) {
    const newType = {
        name: nodeName + config.getConfig().mappingTool.attrSeparatorCharacter + types['elemName'],
        type: types['elemType']
    };

    const newSubscription = {
        ocb_id: nodeName + config.getConfig().mappingTool.attrSeparatorCharacter + types['elemName'],
        submodel_element_short_id: types['elemName']
    };

    switch (types['elemModelType']) {
        case 'Property':
            insertNewType(configJson, submodelIdShort, newType, types['isAttributeActive']);
            insertNewSubscription(configJson, newSubscription);
            break;

        case 'Operation':
            if (configJson.iota.types[`${submodelIdShort}`].lazy.find((element) => element.name === newType.name) === undefined) {
                configJson.iota.types[`${submodelIdShort}`].commands.push(newType);
            }

            break;
        case 'ReferenceElement':
            insertNewType(configJson, submodelIdShort, newType, types['isAttributeActive']);
            insertNewSubscription(configJson, newSubscription);
            break;

        case 'Range':
            insertNewType(configJson, submodelIdShort, newType, types['isAttributeActive']);
            insertNewSubscription(configJson, newSubscription);
            break;

        case 'File':
            insertNewType(configJson, submodelIdShort, newType, types['isAttributeActive']);
            insertNewSubscription(configJson, newSubscription);
            break;

        case 'MultiLanguageProperty':
            insertNewType(configJson, submodelIdShort, newType, types['isAttributeActive']);
            insertNewSubscription(configJson, newSubscription);
            break;

        default:
            config.getLogger().warn(`${types.elemModelType} not supported, this information will be lost. Please update AASNodeMapping function`);
    }
}

function insertNewType(configJson, submodelIdShort, newType, isAttributeActive) {
    if (isAttributeActive) {
        if (configJson.iota.types[`${submodelIdShort}`].active.find((element) => element.name === newType.name) === undefined) {
            configJson.iota.types[`${submodelIdShort}`].active.push(newType);
        }
    } else {
        if (configJson.iota.types[`${submodelIdShort}`].lazy.find((element) => element.name === newType.name) === undefined) {
            configJson.iota.types[`${submodelIdShort}`].lazy.push(newType);
        }
    }
}

function insertNewSubscription(configJson, newSubscription) {
    if (configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].find((element) => element.ocb_id === newSubscription.ocb_id) === undefined) {
        configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].push(newSubscription);
    }
}

exports.AASNodeMapping = AASNodeMapping;
