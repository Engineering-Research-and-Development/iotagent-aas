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

async function getSubmodels(aasServerEndpoint, apiVersion, aasInformation) {
    let apiUrl = aasServerEndpoint;

    if (apiVersion === 'v1') {
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

            extractSubmodelsFromResponse(aasInformation, data);
        } catch (error) {
            console.error(error);
        }
    } else {
        let AASShells = await fetchAASFromServer(aasServerEndpoint);
        apiUrl = apiUrl + '/shells';
        for (let shell of AASShells) {
            const response = await fetch(`${apiUrl}/${btoa(shell.id)}/submodel-refs`);
            const data = await response.json();

            let shellSubmodels = [];

            for (let submodelRef of data['result']) {
                shellSubmodels.push(await fetchSubmodel(aasServerEndpoint, submodelRef['keys'][0]['value']));
            }

            aasInformation.push({
                idShort: shell.idShort,
                submodels: shellSubmodels
            });
        }
    }
}

async function fetchSubmodel(aasServerEndpoint, submodelID) {
    let apiUrl = aasServerEndpoint + '/submodels';

    const response = await fetch(`${apiUrl}/${btoa(submodelID)}`);
    const data = await response.json();

    return data;
}

async function getSubmodelsFromLocalData(data, aasInformation) {
    for (let elem of data['submodels']) {
        aasInformation.push(elem);
    }
}

function extractSubmodelsFromResponse(aasInformation, data) {
    if (Array.isArray(data)) {
        for (let elem of data) {
            aasInformation.push(elem);
        }
    } else {
        for (let elem of data['result']) {
            aasInformation.push(elem);
        }
    }
}

async function fetchAASFromServer(aasServerEndpoint) {
    let shells = [];
    let apiUrl = aasServerEndpoint + '/shells';

    const response = await fetch(apiUrl);
    const data = await response.json();

    for (let shell of data['result']) {
        shells.push({
            id: shell['id'],
            idShort: shell['idShort']
        });
    }

    return shells;
}

exports.getSubmodels = getSubmodels;
exports.getSubmodelsFromLocalData = getSubmodelsFromLocalData;
exports.fetchSubmodel = fetchSubmodel;
