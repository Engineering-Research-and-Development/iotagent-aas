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

function extractNodeInformation(elem) {
    var types = {};

    if (typeof elem['modelType'] === 'object' && !Array.isArray(elem['modelType']) && elem['modelType']) {
        types['elemModelType'] = elem['modelType']['name'];
    } else {
        types['elemModelType'] = elem['modelType'];
    }

    types['elemName'] = elem['idShort'];

    if (elem.hasOwnProperty('identification')) {
        types['id'] = elem['identification']['id'];
    } else if (elem.hasOwnProperty('id')) {
        types['id'] = elem['id'];
    }

    switch (types['elemModelType']) {
        case 'Property':
            if (elem['valueType'] && elem['valueType'].includes('int')) {
                types['elemType'] = 'Number';
            } else {
                types['elemType'] = 'Text';
            }
            break;
        case 'Operation':
            types['elemType'] = 'command';
            break;
        case 'ReferenceElement':
            types['elemType'] = 'StructuredValue';
            break;
        case 'Range':
            types['elemType'] = 'StructuredValue';
            break;
        case 'MultiLanguageProperty':
            types['elemType'] = 'StructuredValue';
            break;
        default:
            break;
    }

    return types;
}

exports.extractNodeInformation = extractNodeInformation;
