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

module.exports = {
    MEASURES_SUFIX: 'attrs',
    CONFIGURATION_SUFIX: 'configuration',
    CONFIGURATION_COMMAND_SUFIX: 'commands',
    CONFIGURATION_COMMAND_UPDATE: 'cmdexe',
    CONFIGURATION_VALUES_SUFIX: 'values',

    PAYLOAD_NGSIv2: 'ngsiv2',
    PAYLOAD_NGSILD: 'ngsild',

    DATE_FORMAT: "yyyymmdd'T'HHMMss'Z'",

    HTTP_MEASURE_PATH: '/iot/d',
    HTTP_CONFIGURATION_PATH: '/configuration',
    HTTP_COMMANDS_PATH: '/commands',

    TIMESTAMP_ATTRIBUTE: 'TimeInstant',
    TIMESTAMP_TYPE_NGSI2: 'DateTime',

    DEFAULT_ATTRIBUTE_TYPE: 'Text',

    COMMAND_STATUS_PENDING: 'PENDING',
    COMMAND_STATUS_ERROR: 'ERROR',
    COMMAND_STATUS_COMPLETED: 'OK',

    MQTTB_ALARM: 'MQTTB-ALARM',
    MQTT_DEFAULT_RETRIES: 5,
    MQTT_DEFAULT_RETRY_TIME: 5,
    MQTT_SHARE_SUBSCRIPTION_GROUP: '$share/json/',
    MQTT_TOPIC_PROTOCOL: 'json',

    AMQP_DEFAULT_EXCHANGE: 'amq.topic',
    AMQP_DEFAULT_QUEUE: 'iotaqueue',
    AMQP_DEFAULT_DURABLE: true,
    AMQP_DEFAULT_RETRIES: 5,
    AMQP_DEFAULT_RETRY_TIME: 5
};
