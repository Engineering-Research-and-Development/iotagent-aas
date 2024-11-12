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

function AASNodeMapping(node, configJson, nodeName, submodelIdShort) {
    let types = extract.extractNodeInformation(node);

    const newType = {
        name: nodeName + '_' + types['elemName'],
        type: types['elemType']
    };

    const newSubscription = {
        ocb_id: nodeName + '_' + types['elemName'],
        submodel_element_short_id: types['elemName']
    };

    switch (types['elemModelType']) {
        case 'Property':
            if (!configJson.iota.types[`${submodelIdShort}`].lazy.includes(newType)) {
                configJson.iota.types[`${submodelIdShort}`].lazy.push(newType);
            }

            if (!configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].includes(newSubscription)) {
                configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].push(newSubscription);
            }

            break;
        case 'Operation':
            if (!configJson.iota.types[`${submodelIdShort}`].commands.includes(newType)) {
                configJson.iota.types[`${submodelIdShort}`].commands.push(newType);
            }

            break;
        case 'ReferenceElement':
            if (!configJson.iota.types[`${submodelIdShort}`].lazy.includes(newType)) {
                configJson.iota.types[`${submodelIdShort}`].lazy.push(newType);
            }

            if (!configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].includes(newSubscription)) {
                configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].push(newSubscription);
            }
            break;
        case 'Range':
            if (!configJson.iota.types[`${submodelIdShort}`].lazy.includes(newType)) {
                configJson.iota.types[`${submodelIdShort}`].lazy.push(newType);
            }

            if (!configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].includes(newSubscription)) {
                configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].push(newSubscription);
            }
            break;
        case 'File':
            if (!configJson.iota.types[`${submodelIdShort}`].lazy.includes(newType)) {
                configJson.iota.types[`${submodelIdShort}`].lazy.push(newType);
            }

            if (!configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].includes(newSubscription)) {
                configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].push(newSubscription);
            }
            break;

        case 'MultiLanguageProperty':
            if (!configJson.iota.types[`${submodelIdShort}`].lazy.includes(newType)) {
                configJson.iota.types[`${submodelIdShort}`].lazy.push(newType);
            }

            if (!configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].includes(newSubscription)) {
                configJson.iota.contextSubscriptions[configJson.iota.contextSubscriptions.length - 1]['mappings'].push(newSubscription);
            }
            break;
        default:
            config.getLogger().warn(`${newType.type} not supported, this information will be lost. Please update AASNodeMapping function`);
    }
}

exports.AASNodeMapping = AASNodeMapping;
