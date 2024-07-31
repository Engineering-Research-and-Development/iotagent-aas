/*
 * Copyright 2022 Engineering Ingegneria Informatica S.p.A.
 *
 * This file is part of iotagent-opcua
 *
 * iotagent-opcua is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-opcua is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-opcua.
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[manfredi.pistone@eng.it, gabriele.deluca@eng.it, walterdomenico.vergara@eng.it, mattiagiuseppe.marzano@eng.it]
 */

/* eslint-disable no-unused-vars */

const extract = require("./extractNodeInformation")
const collectionRecognition = require("./collectionRecognition")
const mapping = require("./AASNodeMapping")

async function nodesCrawler(submodel, configJson) {

    let types = extract.extractNodeInformation(submodel);

    configJson.types[`${types["elemName"]}`] = {
        active: [],
        lazy: [],
        commands: []
    }

    configJson.contextSubscriptions.push(
        {
            id: types["id"],
            type: types["elemModelType"],
            submodel_short_id: types["elemName"],
            mappings: []
        }
    )

    for(let elem of submodel["submodelElements"]){
        await recursiveCrawling(elem, configJson, types["elemName"], types["elemName"]);
    }
    return configJson;
}


async function recursiveCrawling(element, configJson, nodeName, submodelIdShort) {
    let types = extract.extractNodeInformation(element);
    if(collectionRecognition.isSumodelElementCollection(types["elemModelType"]) || collectionRecognition.isSumodelElementList(types["elemModelType"])){
        for(let elem of element["value"]){
            recursiveCrawling(elem, configJson, nodeName + "." +  types["elemName"], submodelIdShort);  
        }
    }else{
        mapping.AASNodeMapping(element, configJson, nodeName, submodelIdShort);
    }
}

exports.nodesCrawler = nodesCrawler;
