/*
 * Copyright 2022 Engineering Ingegneria Informatica S.p.A.
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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[manfredi.pistone@eng.it, gabriele.deluca@eng.it, walterdomenico.vergara@eng.it, mattiagiuseppe.marzano@eng.it]
 */

let config = {};
const fs = require('fs');
let logger = require('logops');
const iotAgentLib = require('iotagent-node-lib');

function anyIsSet(variableSet) {
    for (let i = 0; i < variableSet.length; i++) {
        if (process.env[variableSet[i]]) {
            return true;
        }
    }

    return false;
}

function processEnvironmentVariables() {
    const commonVariables = ['CONFIGURATION_TYPE', 'CONFIG_RETRIEVAL', 'DEFAULT_KEY', 'DEFAULT_TRANSPORT'];

    const iotaVariables = [
        'IOTA_DEFAULTKEY',
        'IOTA_LOGLEVEL',
        'IOTA_TIMESTAMP',
        'IOTA_CB_HOST',
        'IOTA_CB_PORT',
        'IOTA_CB_NGSIVERSION',
        'IOTA_CB_NGSILDCONTEXT',
        'IOTA_CB_SERVICE',
        'IOTA_CB_SUBSERVICE',
        'IOTA_NORTH_PORT',
        'IOTA_REGISTRY_TYPE',
        'IOTA_MONGO_HOST',
        'IOTA_MONGO_PORT',
        'IOTA_MONGO_DB',
        'IOTA_SERVICE',
        'IOTA_SUBSERVICE',
        'IOTA_PROVIDER_URL',
        'IOTA_DEVICEREGDURATION',
        'IOTA_DEFAULTTYPE',
        'IOTA_DEFAULTRESOURCE',
        'IOTA_EXPLICITATTRS',
        'IOTA_EXTENDED_FORBIDDEN_CHARACTERS',
        'IOTA_AUTOPROVISION'
    ];

    const mqttVariables = [
        'IOTA_MQTT_PROTOCOL',
        'IOTA_MQTT_HOST',
        'IOTA_MQTT_PORT',
        'IOTA_MQTT_CA',
        'IOTA_MQTT_CERT',
        'IOTA_MQTT_KEY',
        'IOTA_MQTT_REJECT_UNAUTHORIZED',
        'IOTA_MQTT_USERNAME',
        'IOTA_MQTT_PASSWORD',
        'IOTA_MQTT_QOS',
        'IOTA_MQTT_RETAIN',
        'IOTA_MQTT_RETRIES',
        'IOTA_MQTT_RETRY_TIME',
        'IOTA_MQTT_KEEPALIVE',
        'IOTA_MQTT_AVOID_LEADING_SLASH',
        'IOTA_MQTT_DISABLED'
    ];

    const httpVariables = ['IOTA_HTTP_PORT', 'IOTA_HTTP_TIMEOUT', 'IOTA_HTTP_KEY', 'IOTA_HTTP_CERT'];

    const aasVariables = ['IOTA_AAS_ENDPOINT'];

    const protectedVariables = ['IOTA_MQTT_KEY', 'IOTA_MQTT_USERNAME', 'IOTA_MQTT_PASSWORD', 'IOTA_HTTP_KEY'];

    const mappingToolVariables = ['IOTA_AAS_MT_AGENT_ID', 'IOTA_AAS_MT_ENTITY_ID', 'IOTA_AAS_MT_ENTITY_TYPE', 'IOTA_AAS_MT_STORE_OUTPUT'];

    commonVariables.forEach((key) => {
        let value = process.env[key];
        if (value) {
            logger.info('Setting OPC UA IoTAgent environment variable %s to environment value: %s', key, value);
        }
    });

    if (process.env.CONFIGURATION_TYPE) {
        config.configurationType = process.env.CONFIGURATION_TYPE;
    }
    if (process.env.CONFIG_RETRIEVAL) {
        config.configRetrieval = process.env.CONFIG_RETRIEVAL;
    }
    if (process.env.DEFAULT_KEY) {
        config.defaultKey = process.env.DEFAULT_KEY;
    }
    if (process.env.DEFAULT_TRANSPORT) {
        config.defaultTransport = process.env.DEFAULT_TRANSPORT;
    }

    iotaVariables.forEach((key) => {
        let value = process.env[key];
        if (value) {
            logger.info('Setting IoTAgent Lib environment variable %s to environment value: %s', key, value);
        }
    });

    if (process.env.IOTA_DEFAULTKEY) {
        config.iota.defaultKey = process.env.IOTA_DEFAULTKEY;
    }

    if (process.env.IOTA_LOGLEVEL) {
        config.iota.logLevel = process.env.IOTA_LOGLEVEL;
    }

    if (process.env.IOTA_TIMESTAMP) {
        config.iota.timestamp = process.env.IOTA_TIMESTAMP === 'true' ? true : false;
    }

    if (process.env.IOTA_CB_HOST) {
        config.iota.contextBroker.host = process.env.IOTA_CB_HOST;
    }

    if (process.env.IOTA_CB_PORT) {
        config.iota.contextBroker.port = process.env.IOTA_CB_PORT;
    }

    if (process.env.IOTA_CB_NGSIVERSION) {
        config.iota.contextBroker.ngsiVersion = process.env.IOTA_CB_NGSIVERSION;
    }

    if (process.env.IOTA_CB_NGSILDCONTEXT) {
        config.iota.contextBroker.jsonLdContext = process.env.IOTA_CB_NGSILDCONTEXT;
    }

    if (process.env.IOTA_CB_SERVICE) {
        config.iota.contextBroker.service = process.env.IOTA_CB_SERVICE;
    }

    if (process.env.IOTA_CB_SUBSERVICE) {
        config.iota.contextBroker.subservice = process.env.IOTA_CB_SUBSERVICE;
    }

    if (process.env.IOTA_NORTH_PORT) {
        config.iota.server.port = process.env.IOTA_NORTH_PORT;
    }

    if (process.env.IOTA_REGISTRY_TYPE) {
        config.iota.deviceRegistry.type = process.env.IOTA_REGISTRY_TYPE;
    }

    if (process.env.IOTA_MONGO_HOST) {
        config.iota.mongodb.host = process.env.IOTA_MONGO_HOST;
    }

    if (process.env.IOTA_MONGO_PORT) {
        config.iota.mongodb.port = process.env.IOTA_MONGO_PORT;
    }

    if (process.env.IOTA_MONGO_DB) {
        config.iota.mongodb.db = process.env.IOTA_MONGO_DB;
    }

    if (process.env.IOTA_SERVICE) {
        config.iota.service = process.env.IOTA_SERVICE;
    }

    if (process.env.IOTA_SUBSERVICE) {
        config.iota.subservice = process.env.IOTA_SUBSERVICE;
    }

    if (process.env.IOTA_PROVIDER_URL) {
        config.iota.providerUrl = process.env.IOTA_PROVIDER_URL;
    }

    if (process.env.IOTA_DEVICEREGDURATION) {
        config.iota.deviceRegistrationDuration = process.env.IOTA_DEVICEREGDURATION;
    }

    if (process.env.IOTA_DEFAULTTYPE) {
        config.iota.defaultType = process.env.IOTA_DEFAULTTYPE;
    }

    if (process.env.IOTA_DEFAULTRESOURCE) {
        config.iota.defaultResource = process.env.IOTA_DEFAULTRESOURCE;
    }

    if (process.env.IOTA_EXPLICITATTRS) {
        config.iota.explicitAttrs = process.env.IOTA_EXPLICITATTRS === 'true' ? true : false;
    }

    if (process.env.IOTA_EXTENDED_FORBIDDEN_CHARACTERS) {
        config.iota.extendedForbiddenCharacters = process.env.IOTA_EXTENDED_FORBIDDEN_CHARACTERS;
    }

    if (process.env.IOTA_AUTOPROVISION) {
        config.iota.autoprovision = process.env.IOTA_AUTOPROVISION === 'true' ? true : false;
    }

    mqttVariables.forEach((key) => {
        let value = process.env[key];
        if (value) {
            if (key.endsWith('USERNAME') || key.endsWith('PASSWORD') || key.endsWith('KEY')) {
                value = '********';
            }
            logger.info('Setting MQTT environment variable %s to environment value: %s', key, value);
        }
    });

    if (process.env.IOTA_MQTT_PROTOCOL) {
        config.mqtt.protocol = process.env.IOTA_MQTT_PROTOCOL;
    }

    if (process.env.IOTA_MQTT_HOST) {
        config.mqtt.host = process.env.IOTA_MQTT_HOST;
    }

    if (process.env.IOTA_MQTT_PORT) {
        config.mqtt.port = process.env.IOTA_MQTT_PORT;
    }

    if (process.env.IOTA_MQTT_CA) {
        config.mqtt.ca = process.env.IOTA_MQTT_CA;
    }

    if (process.env.IOTA_MQTT_CERT) {
        config.mqtt.cert = process.env.IOTA_MQTT_CERT;
    }

    if (process.env.IOTA_MQTT_KEY) {
        config.mqtt.key = process.env.IOTA_MQTT_KEY;
    }

    if (process.env.IOTA_MQTT_REJECT_UNAUTHORIZED) {
        config.mqtt.rejectUnauthorized = process.env.IOTA_MQTT_REJECT_UNAUTHORIZED;
    }

    if (process.env.IOTA_MQTT_USERNAME) {
        config.mqtt.username = process.env.IOTA_MQTT_USERNAME;
    }

    if (process.env.IOTA_MQTT_PASSWORD) {
        config.mqtt.password = process.env.IOTA_MQTT_PASSWORD;
    }

    if (process.env.IOTA_MQTT_QOS) {
        config.mqtt.qos = process.env.IOTA_MQTT_QOS;
    }

    if (process.env.IOTA_MQTT_RETAIN) {
        config.mqtt.retain = process.env.IOTA_MQTT_RETAIN;
    }

    if (process.env.IOTA_MQTT_RETRIES) {
        config.mqtt.retries = process.env.IOTA_MQTT_RETRIES;
    }

    if (process.env.IOTA_MQTT_RETRY_TIME) {
        config.mqtt.retryTime = process.env.IOTA_MQTT_RETRY_TIME;
    }

    if (process.env.IOTA_MQTT_KEEPALIVE) {
        config.mqtt.keepAlive = process.env.IOTA_MQTT_KEEPALIVE;
    }

    if (process.env.IOTA_MQTT_AVOID_LEADING_SLASH) {
        config.mqtt.avoidLeadingSlash = process.env.IOTA_MQTT_AVOID_LEADING_SLASH;
    }

    if (process.env.IOTA_MQTT_DISABLED) {
        config.mqtt.disabled = process.env.IOTA_MQTT_DISABLED;
    }

    httpVariables.forEach((key) => {
        let value = process.env[key];
        if (value) {
            if (key.endsWith('USERNAME') || key.endsWith('PASSWORD') || key.endsWith('KEY')) {
                value = '********';
            }
            logger.info('Setting HTTP environment variable %s to environment value: %s', key, value);
        }
    });

    if (process.env.IOTA_HTTP_PORT) {
        config.http.port = process.env.IOTA_HTTP_PORT;
    }

    if (process.env.IOTA_HTTP_TIMEOUT) {
        config.http.timeout = process.env.IOTA_HTTP_TIMEOUT;
    }

    if (process.env.IOTA_HTTP_CERT) {
        config.http.cert = process.env.IOTA_HTTP_CERT;
    }

    if (process.env.IOTA_HTTP_KEY) {
        config.http.key = process.env.IOTA_HTTP_KEY;
    }

    aasVariables.forEach((key) => {
        let value = process.env[key];
        if (value) {
            if (key.endsWith('USERNAME') || key.endsWith('PASSWORD') || key.endsWith('KEY')) {
                value = '********';
            }
            logger.info('Setting AAS environment variable %s to environment value: %s', key, value);
        }
    });

    if (process.env.IOTA_AAS_ENDPOINT) {
        config.aas.endpoint = process.env.IOTA_AAS_ENDPOINT;
    }

    protectedVariables.forEach((key) => {
        iotAgentLib.configModule.getSecretData(key);
    });

    mappingToolVariables.forEach((key) => {
        let value = process.env[key];
        if (value) {
            logger.info('Setting mappingTool environment variable %s to environment value: %s', key, value);
        }
    });

    if (process.env.IOTA_AAS_MT_AGENT_ID) {
        config.mappingTool.agentId = process.env.IOTA_AAS_MT_AGENT_ID;
    }

    if (process.env.IOTA_AAS_MT_ENTITY_ID) {
        config.mappingTool.entityId = process.env.IOTA_AAS_MT_ENTITY_ID;
    }

    if (process.env.IOTA_AAS_MT_ENTITY_TYPE) {
        config.mappingTool.entityType = process.env.IOTA_AAS_MT_ENTITY_TYPE;
    }

    if (process.env.IOTA_AAS_MT_STORE_OUTPUT) {
        config.mappingTool.storeOutput = process.env.IOTA_AAS_MT_STORE_OUTPUT === 'true' ? true : false;
    }
}

function setConfig(newConfig) {
    config = newConfig;

    processEnvironmentVariables();
}

function getConfig() {
    return config;
}

function setLogger(newLogger) {
    logger = newLogger;
}

function getLogger() {
    return logger;
}

exports.setConfig = setConfig;
exports.getConfig = getConfig;
exports.setLogger = setLogger;
exports.getLogger = getLogger;
