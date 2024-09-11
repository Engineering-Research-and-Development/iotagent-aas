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

const fetch = require('node-fetch');
const config = require('../configService');

async function getSubmodels(aasServerEndpoint, submodels) {
    let apiUrl = aasServerEndpoint;

    if (!apiUrl.split('/').includes('aas')) {
        config.getLogger().info(`"aas" endpoint not present in the URL, it will be added automatically`);
        apiUrl = apiUrl + '/aas';
    }

    if (!apiUrl.split('/').includes('submodels')) {
        config.getLogger().info(`"submodels" endpoint not present in the URL, it will be added automatically`);
        apiUrl = apiUrl + '/submodels';
    }

    config.getLogger().info(`Contacting AAS server at URL: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        for (let elem of data) {
            submodels.push(elem);
        }
    } catch (error) {
        console.error(error);
    }
}

async function getSubmodelsFromLocalData(data, submodels) {
    for (let elem of data['submodels']) {
        submodels.push(elem);
    }
}

exports.getSubmodels = getSubmodels;
exports.getSubmodelsFromLocalData = getSubmodelsFromLocalData;
