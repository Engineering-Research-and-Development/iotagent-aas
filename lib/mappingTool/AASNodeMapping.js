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

function AASNodeMapping(node, configJson, nodeName, submodelIdShort) {

    let types = extract.extractNodeInformation(node);
    switch(types["elemModelType"]) {
        case "Property":
            configJson.types[`${submodelIdShort}`].active.push(
                {
                    name: nodeName + "." +  types["elemName"],
                    type: types["elemType"]
                }
            )
            
            configJson.contextSubscriptions[configJson.contextSubscriptions.length - 1]["mappings"].push(
                {
                    ocb_id: nodeName + "." +  types["elemName"],
                    submodel_element_short_id: nodeName + "." +  types["elemName"]
                }
            )
            break;
        case "Operation":
            configJson.types[`${submodelIdShort}`].commands.push(
                {
                    name: nodeName + "." +  types["elemName"],
                    type: types["elemType"]
                }
            )
            break;
        default:
    }
}

exports.AASNodeMapping = AASNodeMapping;
