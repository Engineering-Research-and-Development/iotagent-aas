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

const client = require('./aasClient');
const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('../configService');
const nodesCrawler = require('./nodesCrawler');
//const localFIle = require("../json_file_containing_the_aas"); used for local file tests
const context = {
    op: 'IoTAgentAAS.AASMappingTool'
};

async function mappingTool(configJS) {
    let configJson = Object.assign({}, configJS);

    config.getLogger().info(context, 'Welcome to ENGINEERING INGEGNERIA INFORMATICA FIWARE AAS AGENT MAPPING TOOL');

    async function mappingToolRun() {
        try {
            configJson.iota.types = {};
            configJson.iota.contexts = [];
            configJson.iota.contextSubscriptions = [];

            let submodels = [];

            // fetch submodel from aas server
            await client.getSubmodels(configJS.aas.endpoint, configJS.aas.api_version, submodels);
            //await client.getSubmodelsFromLocalData(localFIle, submodels); use local files

            if (submodels.length === 0) {
                config.getLogger().error('No submodel found');
                process.exit(1);
            } else {
                config.getLogger().info('Submodel fetched from AAS server');
            }
            for (let submodel of submodels) {
                await nodesCrawler.nodesCrawler(submodel, configJson);
            }

            config.getLogger().info(context, 'config.json --> \n', JSON.stringify(configJson));
        } catch (err) {
            config.getLogger().info(context, 'An error has occured : ', err);
        }
    }
    await mappingToolRun();

    const resultJson = {
        types: configJson.iota.types,
        contexts: configJson.iota.contexts,
        contextSubscriptions: configJson.iota.contextSubscriptions
    };

    if (configJson['mappingTool']['storeOutput']) {
        const configFolder = path.join(process.cwd(), '/conf');
        const configFile = path.join(configFolder, 'config_mapping_tool.json');
        fs.writeFile(configFile, JSON.stringify(resultJson, null, 4), 'utf8', function (err) {
            if (err) {
                config.getLogger().warn('An error occured while saving config_mapping_tool.json');
                return;
            }
            config.getLogger().info('config_mapping_tool.json has been saved successfully.');
        });
    }

    return resultJson;
}

exports.mappingTool = mappingTool;
