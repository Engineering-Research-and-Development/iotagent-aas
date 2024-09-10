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
