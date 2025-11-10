[![FIWARE Banner](https://fiware.github.io/tutorials.IoT-over-MQTT/img/fiware.png)](https://www.fiware.org/developers)

# AAS Agent Tutorial

This is a step-by-step tutorial that will introduce in detail how to enable AAS to FIWARE connecting an AAS server to
Orion Context Broker using the agent. The AAS data will be automatically published in a FIWARE Orion Context Broker
using NGSI data model.

## Actors

The actors involved in the scenario are:

-   **AAS Server**, representing the data source (in this tutorial will be intended to be a basyx server)
-   **AAS Agent**, the connector to join industrial environment to FIWARE
-   **Orion Context Broker**, the broker as entry point of FIWARE platform

#### AAS Server

For tutorial purposes, a basyx server will be used. It is possible to dowload the docker-compose set up for the basyx
server at this [page](https://www.basyx.org/get-started/download)

#### AAS Agent

IoT Agent can be configured as described in the [user guide](./user_and_programmers_manual.md). In order to start
playing with the above mentioned AAS server, configuration files have been already edited and available in _conf_
folder.

#### Orion Context Broker

Orion Context Broker can be external, however to have a black box for testing, it will be included in docker compose in
order to have a self-supporting environment. Be aware to choose the correct version, use _orion_ if it's needed to test
the Agent with NGSI v2.

## Step-by-step Tutorial

In this paragraph we are going to describe how to quickly deploy a working testbed consisting of all the actors: Basyx,
Agent, Orion Context Broker and the MongoDB instance.

#### Requirements

-   Docker (Version 19.03.1+)
-   Docker-compose (Version 1.24.1+)

Install docker and docker-compose by following the instructions available on the official web site:

-   Docker: [here](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
-   Docker-Compose: [here](https://docs.docker.com/compose/install/)

Once docker has been correctly installed you can continue with the other steps.

#### Step 1 - Clone the AAS Agent Repository

Open a terminal and move into a folder in which to create the new folder containing the IotAgent testbed

Then run:

```bash
git clone "https://github.com/Engineering-Research-and-Development/iotagent-aas"
```

#### Step 2 - Run the testbed

To launch the whole testbed:

```bash
cd iotagent-aas/docker
docker-compose up -d
```

**N.B:** The IoT Agent is supposd to connect to at least one submodel on the AAS server. if the agent connect to an
empty AAS server it will stop by giving an error.

After that you can run:

```bash
docker ps
```

to check if all the required components are running

#### Step 3 - Start using the testbed

The behaviour of the agent will be different by the configuration type setted for the excution

Three different configutation types are available:

-   auto : mappingTool will be run and runtime device mappings will be loaded
-   dynamic : device mappings from config.js will be ignored, REST API Provisioning is mandatory
-   static : device mappings from config.js will be loaded

It is recommended to **use auto mode** to allow the agent to map all submodels on the AAS server completely
autonomously.

#### Step 4 - Provision a new Device (not necessary if using _auto_ configuration type)

If the _dynamic_ configuration type is beign used, the single devices need to be manually provisioned on the AAS agent.
A single device correspond to an AAS submodel registered on the AAS server.

**N.B:** the following code is an example to show how to make a request to the REST API of the IoT Agent AAS, it not
supposed to work on your enviroment. To avoid this kind of complexity, it is reccomended to use the _auto_ configuration
type

```bash
curl --location 'http://localhost:4041/iot/devices' \
--header 'fiware-service: aas_ticket' \
--header 'fiware-servicepath: /demo' \
--header 'Content-Type: application/json' \
--data '{
  "devices": [
        {
          "device_id": "urn:DaCapo:sm:BillOfMaterials:3:0:03661806-1a51-4b4c-9807-6e5ec883d88b",
          "apikey": "iot",
          "service": "aas_ticket",
          "service_path": "/demo",
          "entity_name": "urn:DaCapo:sm:BillOfMaterials:3:0:03661806-1a51-4b4c-9807-6e5ec883d88b",
          "entity_type": "BillOfMaterials",
          "endpoint": "http://aas-env:8081",
          "polling": false,
          "transport": "HTTP",
          "attributes": [
              {
                  "name": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_MaterialName",
                  "type": "Text"
              },
              {
                  "name": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_CountryOfOrigin",
                  "type": "Text"
              }
          ],
          "lazy": [
              {
                  "name": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_Weight",
                  "type": "Text"
              },
              {
                  "name": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_IsHazardous",
                  "type": "Text"
              },
              {
                  "name": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_IsCRM",
                  "type": "Text"
              },
              {
                  "name": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_BioBasedMaterials",
                  "type": "Text"
              },
              {
                  "name": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_RecycledMaterials",
                  "type": "Text"
              },
              {
                  "name": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_RecycableMaterial",
                  "type": "Text"
              }
          ],
          "commands": [],
          "static_attributes": [],
          "internal_attributes": {
              "contexts": [],
              "contextSubscriptions": [
                  {
                      "id": "urn:DaCapo:sm:BillOfMaterials:3:0:03661806-1a51-4b4c-9807-6e5ec883d88b",
                      "type": "BillOfMaterials",
                      "submodel_short_id": "BillOfMaterials",
                      "mappings": [
                          {
                              "ocb_id": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_MaterialName",
                              "submodel_element_short_id": "MaterialName"
                          },
                          {
                              "ocb_id": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_CountryOfOrigin",
                              "submodel_element_short_id": "CountryOfOrigin"
                          },
                          {
                              "ocb_id": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_Weight",
                              "submodel_element_short_id": "Weight"
                          },
                          {
                              "ocb_id": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_IsHazardous",
                              "submodel_element_short_id": "IsHazardous"
                          },
                          {
                              "ocb_id": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_IsCRM",
                              "submodel_element_short_id": "IsCRM"
                          },
                          {
                              "ocb_id": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_BioBasedMaterials",
                              "submodel_element_short_id": "BioBasedMaterials"
                          },
                          {
                              "ocb_id": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_RecycledMaterials",
                              "submodel_element_short_id": "RecycledMaterials"
                          },
                          {
                              "ocb_id": "BatteryAAS_BillOfMaterials_Battery_MaterialInformation_RecycableMaterial",
                              "submodel_element_short_id": "RecycableMaterial"
                          }
                      ],
                      "service": "aas_ticket",
                      "subservice": "/demo"
                  }
              ]
          }
        }
    ]
}'
```

#### Step 5 - Get devices

Check if the submodels has been provisioned on the agent by sending the following request:

```bash
curl http://localhost:4041/iot/devices \
     -H "fiware-service: aas_ticket" \
     -H "fiware-servicepath: /demo"
```

#### Step 6 - Monitor Agent behaviour

Any activity regarding the Agent can be monitored looking at the logs. To view docker testbed logs run:

```bash
cd iotagent-aas/docker
docker-compose logs -f
```

#### Interlude

The IoT Agent AAS manages the attributes in the following ways:

-   **Active attributes** They're written on the Context broker entity as normal attributes. Those attributes are
    read/write informations managed directly by the Context Broker.

-   **Lazy attributes** They require the interaction beetwen the IoT Agent and the AAS server. When this informations
    are requested, the agent fetchs the current value of this kind of attributes directly from the AAS server. Those
    attributes are read-only informations.

## What's next?

Finishing this tutorial you have an overview on how the Agent works and interacts with the other components (AAS Server
and Orion Context Broker).

In order to fully understand how the AAS IotAgent can be used in a **_real environment_** (i.e. connected to an
**_external AAS Server_**) you probably need some further information on the initialization/configuration stage, i.e.
where the link between the Agent and the machinery is established.

These information are available in the [User & Programmers Manual](./user_and_programmers_manual.md) section

#### How to build the Docker Image

If you have changes to the Agent codebase that you want to integrate, or you want to modify the current Docker
deployment package:

[Here](docker_readme.md) you find the instructions on how to build a Docker Image for the Agent

## Appendices

#### Appendix A - Customize the environment

Docker Compose can be downloaded here [docker-compose.yml](../docker/docker-compose.yml):

Modifying this file you can:

-   Change exposed ports
-   Extend the stack with other services (e.g. Cygnus)

```yaml
volumes:
    mongodb: ~

services:
    iot-agent:
        image: iotagent4fiware/iotagent-aas:latest
        hostname: iotagent-aas
        container-name: iotagent-aas
        depends_on:
            - mongodb
            - orion
        networks:
            - hostnet
        ports:
            - "4041:4041"
            - "7896:7896"
        environment:
            - "DEFAULT_KEY=iot"
            - "DEFAULT_TRANSPORT=HTTP"
            - "IOTA_LOGLEVEL=DEBUG"
            - "IOTA_TIMESTAMP=true"
            - "IOTA_CB_HOST=orion"
            - "IOTA_CB_PORT=1026"
            - "IOTA_CB_NGSIVERSION=v2"
            - "IOTA_CB_NGSILDCONTEXT=https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"
            - "IOTA_CB_SERVICE=aas_basyx"
            - "IOTA_CB_SUBSERVICE=/demo"
            - "IOTA_NORTH_PORT=4041"
            - "IOTA_REGISTRY_TYPE=mongodb"
            - "IOTA_MONGO_HOST=mongodb"
            - "IOTA_MONGO_PORT=27017"
            - "IOTA_MONGO_DB=iotagent_aas"
            - "IOTA_SERVICE=aas_basyx"
            - "IOTA_SUBSERVICE=/demo"
            - "IOTA_PROVIDER_URL=http://iotagent-aas:4041"
            - "IOTA_DEVICEREGDURATION=P20Y"
            - "IOTA_DEFAULTTYPE=Device"
            - "IOTA_DEFAULTRESOURCE=/iot/aas"
            - "IOTA_EXPLICITATTRS=true"
            - "IOTA_AUTOPROVISION=true"
            - "IOTA_HTTP_PORT=7896"
            - "IOTA_HTTP_TIMEOUT=1000"
            - "IOTA_HTTP_KEY="
            - "IOTA_HTTP_CERT="
            - "IOTA_AAS_ENDPOINT=http://aas-env:8081"
            - "IOTA_AAS_API_VERSION=v2"
        volumes:
            - ../conf:/opt/iotagent-aas/conf

    mongodb:
        image: mongo:4.2
        hostname: mongodb
        networks:
            - hostnet
        ports:
            - "27017:27017"
        command: --bind_ip_all
        volumes:
            - mongodb:/data

    orion:
        image: fiware/orion:3.11.0
        #image: fiware/orion-ld:1.8.0
        hostname: orion
        depends_on:
            - mongodb
        networks:
            - hostnet
        ports:
            - "1026:1026"
        command: -dbhost mongodb -logLevel DEBUG -httpTimeout 50000 -inReqPayloadMaxSize 500000000

networks:
    hostnet:
```
