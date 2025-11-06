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
const collectionRecognition = require('./collectionRecognition');
const mapping = require('./AASNodeMapping');
const config = require('../configService');

async function nodesCrawler(submodel, configJson, shellId = undefined) {
    if (!submodel.hasOwnProperty('submodelElements')) {
        return configJson;
    }

    let types = extract.extractNodeInformation(submodel);

    if (!configJson.iota.types.hasOwnProperty(`${types['elemName']}`)) {
        configJson.iota.types[`${types['elemName']}`] = {
            active: [],
            lazy: [],
            commands: []
        };
    }

    configJson.iota.contextSubscriptions.push({
        id: types['id'],
        type: types['elemName'],
        submodel_short_id: types['elemName'],
        submodel_long_id: types['aasLongId'],
        mappings: [],
        service: configJson.iota.service,
        subservice: configJson.iota.subservice
    });

    let rootElement;

    if (shellId === undefined) {
        rootElement = types['elemName'];
    } else {
        rootElement = shellId + config.getConfig().mappingTool.attrSeparatorCharacter + types['elemName'];
    }

    for (let elem of submodel['submodelElements']) {
        await recursiveCrawling(elem, configJson, rootElement, types['elemName']);
    }
    return configJson;
}

async function recursiveCrawling(element, configJson, nodeName, submodelIdShort) {
    let types = extract.extractNodeInformation(element);
    if (collectionRecognition.isSumodelElementCollection(types['elemModelType']) || collectionRecognition.isSumodelElementList(types['elemModelType'])) {
        if (element.hasOwnProperty('value')) {
            for (let elem of element['value']) {
                recursiveCrawling(elem, configJson, nodeName + config.getConfig().mappingTool.attrSeparatorCharacter + types['elemName'], submodelIdShort);
            }
        }
    } else if (collectionRecognition.isEntity(types['elemModelType'])) {
        if (element.hasOwnProperty('statements')) {
            for (let statement of element['statements']) {
                recursiveCrawling(statement, configJson, nodeName + config.getConfig().mappingTool.attrSeparatorCharacter + types['elemName'], submodelIdShort);
            }
        }
    } else {
        mapping.AASNodeMapping(types, configJson, nodeName, submodelIdShort);
    }
}

exports.nodesCrawler = nodesCrawler;
