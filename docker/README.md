# FIWARE IoT Agent for the AAS (Asset Administration Shell)

[![FIWARE IoT Agents](https://nexus.lab.fiware.org/repository/raw/public/badges/chapters/iot-agents.svg)](https://www.fiware.org/developers/catalogue/)
[![](https://nexus.lab.fiware.org/repository/raw/public/badges/stackoverflow/iot-agents.svg)](https://stackoverflow.com/questions/tagged/fiware+iot)

An Internet of Things Agent accepting data from AAS servers. This IoT Agent is designed to be a bridge between the AAS
and the
[NGSI](https://swagger.lab.fiware.org/?url=https://raw.githubusercontent.com/Fiware/specifications/master/OpenAPI/ngsiv2/ngsiv2-openapi.json)
interface of a context broker.

The intended level of complexity to support these operations should consider a limited human intervention (mainly during
the setup of a new AAS endpoint), through the mean of a parametrization task (either manual or semi-automatic, using a
text-based parametrization or a simple UI to support the configuration) so that no software coding is required to adapt
the agent to different AAS servers.

It is based on the [IoT Agent Node.js Library](https://github.com/telefonicaid/iotagent-node-lib). Further general
information about the FIWARE IoT Agents framework, its architecture and the common interaction model can be found in the
library's GitHub repository.

This project is part of [FIWARE](https://www.fiware.org/). For more information check the FIWARE Catalogue entry for the
[IoT Agents](https://github.com/Fiware/catalogue/tree/master/iot-agents).

## How to use this image

The IoT Agent must be instantiated and connected to an instance of the
[Orion Context Broker](https://fiware-orion.readthedocs.io/en/latest/), a sample `docker-compose` file can be found
below.

If the `IOTA_REGISTRY_TYPE=mongodb`, a [MongoDB](https://www.mongodb.com/) database instance is also required - the
example below assumes that you have a `/data` directory in your hosting system in order to hold database files - please
amend the attached volume to suit your own configuration.

```yml
version: "3.1"

volumes:
    mongodb: ~

services:
    iot-agent:
        image: iotagent4fiware/iotagent-aas:latest
        hostname: iotagent-aas
        depends_on:
            - mongodb
            - iotcarsrv
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
            - "IOTA_CB_SERVICE=aas_ticket"
            - "IOTA_CB_SUBSERVICE=/demo"
            - "IOTA_NORTH_PORT=4041"
            - "IOTA_REGISTRY_TYPE=mongodb"
            - "IOTA_MONGO_HOST=mongodb"
            - "IOTA_MONGO_PORT=27017"
            - "IOTA_MONGO_DB=iotagent_aas"
            - "IOTA_SERVICE=aas_ticket"
            - "IOTA_SUBSERVICE=/demo"
            - "IOTA_PROVIDER_URL=http://iotagent-aas:4041"
            - "IOTA_DEVICEREGDURATION=P20Y"
            - "IOTA_DEFAULTTYPE=Device"
            - "IOTA_DEFAULTRESOURCE=/iot/aas"
            - "IOTA_EXPLICITATTRS=true"
            - "IOTA_EXTENDED_FORBIDDEN_CHARACTERS=[]"
            - "IOTA_AUTOPROVISION=true"
            - "IOTA_MQTT_PROTOCOL=mqtt"
            - "IOTA_MQTT_HOST=mosquitto"
            - "IOTA_MQTT_PORT=1883"
            - "IOTA_MQTT_CA="
            - "IOTA_MQTT_CERT="
            - "IOTA_MQTT_KEY="
            - "IOTA_MQTT_REJECT_UNAUTHORIZED=true"
            - "IOTA_MQTT_USERNAME="
            - "IOTA_MQTT_PASSWORD="
            - "IOTA_MQTT_QOS=0"
            - "IOTA_MQTT_RETAIN=false"
            - "IOTA_MQTT_RETRIES=5"
            - "IOTA_MQTT_RETRY_TIME=5"
            - "IOTA_MQTT_KEEPALIVE=60"
            - "IOTA_MQTT_AVOID_LEADING_SLASH=false"
            - "IOTA_MQTT_DISABLED=false"
            - "IOTA_HTTP_PORT=7896"
            - "IOTA_HTTP_TIMEOUT=1000"
            - "IOTA_HTTP_KEY="
            - "IOTA_HTTP_CERT="
            - "IOTA_AAS_ENDPOINT=http://localhost:9000/aas"
            - "IOTA_AAS_MT_AGENT_ID=age01_"
            - "IOTA_AAS_MT_ENTITY_ID=ticketmgmt01"
            - "IOTA_AAS_MT_ENTITY_TYPE=TicketManagement"
            - "IOTA_AAS_MT_STORE_OUTPUT=true"
        volumes:
            - ../conf:/opt/iotagent-aas/conf

    mongodb:
        image: mongo:4.2
        hostname: mongodb
        networks:
            - hostnet
        expose:
            - "27017"
        command: --bind_ip_all
        volumes:
            - mongodb:/data

    orion:
        image: fiware/orion
        hostname: orion
        depends_on:
            - mongodb
        networks:
            - hostnet
        ports:
            - "1026:1026"
        command: -dbhost mongodb -logLevel DEBUG

networks:
    hostnet:
```

## Configuration with environment variables

Many settings can be configured using Docker environment variables. A typical IoT Agent Docker container is driven by
environment variables such as those shown below:

-   `CONFIGURATION_TYPE` - flag indicating which configuration type to perform. Possible choices are: auto, dynamic and
    static
-   `CONFIG_RETRIEVAL` - flag indicating whether the incoming notifications to the IoTAgent should be processed using
    the bidirectionality plugin from the latest versions of the library or the AAS-specific configuration retrieval
    mechanism.
-   `DEFAULT_KEY` - Default API Key, to use with device that have been provisioned without a Configuration Group.
-   `DEFAULT_TRANSPORT` - Default transport protocol when no transport is provisioned through the Device Provisioning
    API.
-   `IOTA_LOGLEVEL` - Log level for iotagentnode lib
-   `IOTA_TIMESTAMP` - Whether the IoTAgent will add the TimeInstant attribute to every entity created, as well as a
    TimeInstant metadata to each attribute, with the current timestamp
-   `IOTA_CB_HOST` - Hostname of the context broker to update context
-   `IOTA_CB_PORT` - Port that context broker listens on to update context
-   `IOTA_CB_NGSIVERSION` - Version of the Context Broker
-   `IOTA_CB_NGSILDCONTEXT` - JSON LD Context
-   `IOTA_CB_SERVICE` - Fallback Tenant for the Context Broker
-   `IOTA_CB_SUBSERVICE` - Fallback Path for the Context Broker
-   `IOTA_NORTH_PORT` - Port used for configuring the IoT Agent and receiving context updates from the context broker
-   `IOTA_REGISTRY_TYPE` - Whether to hold IoT device info in memory or in a database
-   `IOTA_MONGO_HOST` - The hostname of MongoDB - used for holding device and service information
-   `IOTA_MONGO_PORT` - The port that MongoDB is listening on
-   `IOTA_MONGO_DB` - The name of the database used in MongoDB
-   `IOTA_SERVICE` - Default service, for IoT Agent installations that won't require preregistration
-   `IOTA_SUBSERVICE` - Default subservice, for IoT Agent installations that won't require preregistration
-   `IOTA_PROVIDER_URL` - URL passed to the Context Broker when commands are registered, used as a forwarding URL
    location when the Context Broker issues a command to a device
-   `IOTA_DEVICEREGDURATION` - Default maximum expire date for device registrations
-   `IOTA_DEFAULTTYPE` - Default type, for IoT Agent installations that won't require preregistration
-   `IOTA_DEFAULTRESOURCE` - Default resource of the IoT Agent. This value must be different for every IoT Agent
    connecting to the IoT Manager
-   `IOTA_EXPLICITATTRS` - Flag indicating whether the incoming measures to the IoTAgent should be processed as per the
    "attributes" field
-   `IOTA_EXTENDED_FORBIDDEN_CHARACTERS` - List of characters to be filtered before forwarding any request to the
    Context Broker
-   `IOTA_AUTOPROVISION` - Flag indicating whether to provision the Group and Device automatically
-   `IOTA_AAS_ENDPOINT` - Endpoint of AAS Server
-   `IOTA_AAS_ENDPOINT` - Endpoint of AAS Server
-   `IOTA_AAS_ENDPOINT` - Endpoint of AAS Server
-   `IOTA_AAS_MT_AGENT_ID` - agentId prefix to be assigned to the newly generated entity from MappingTool execution
-   `IOTA_AAS_MT_ENTITY_ID` - entityId to be assigned to the newly generated entity from MappingTool execution
-   `IOTA_AAS_MT_ENTITY_TYPE` - entityType to be assigned to the newly generated entity from MappingTool execution
-   `IOTA_AAS_MT_STORE_OUTPUT` - boolean flag to determine whether to store the output of the mapping tool execution or
    not

### Further Information

The full set of overrides for the general parameters applicable to all IoT Agents are described in the Configuration
section of the IoT Agent Library
[Installation Guide](https://iotagent-node-lib.readthedocs.io/en/latest/installationguide/index.html#configuration).

Further settings for IoT Agent for AAS itself - can be found in the IoT Agent for AAS
[Installation Guide](https://iotagent-aas.readthedocs.io/en/latest/installationguide/index.html#configuration).

## How to build an image

The [Dockerfile](https://github.com/Engineering-Research-and-Development/iotagent-aas/blob/master/docker/Dockerfile)
associated with this image can be used to build an image in several ways:

-   By default, the `Dockerfile` retrieves the **latest** version of the codebase direct from GitHub (the `build-arg` is
    optional):

```console
docker build -t iot-agent . --no-cache --build-arg DOWNLOAD=lastest
```

-   You can also download a specific release by running this `Dockerfile` with the build argument `DOWNLOAD=<version>`

```console
docker build -t iot-agent . --no-cache --build-arg DOWNLOAD=2.0.0
```

## Building from your own fork

To download code from your own fork of the GitHub repository add the `GITHUB_ACCOUNT`, `GITHUB_REPOSITORY` and
`SOURCE_BRANCH` arguments (default `master`) to the `docker build` command.

```console
docker build -t iot-agent . \
    --build-arg GITHUB_ACCOUNT=<your account> \
    --build-arg GITHUB_REPOSITORY=<your repo> \
    --build-arg SOURCE_BRANCH=<your branch>
```

## Building from your own source files

Alternatively, if you want to build directly from your own sources, please copy the existing `Dockerfile` into file the
root of the repository and amend it to copy over your local source using :

```Dockerfile
COPY . /opt/iotagent-aas/
```

Full instructions can be found within the `Dockerfile` itself.

### Using PM2

The IoT Agent within the Docker image can be run encapsulated within the [pm2](http://pm2.keymetrics.io/) Process
Manager by adding the `PM2_ENABLED` environment variable.

```console
docker run --name iotagent -e PM2_ENABLED=true -d iotagent4fiware/iotagent-aas
```

Use of pm2 is **disabled** by default. It is unnecessary and counterproductive to add an additional process manager if
your dockerized environment is already configured to restart Node.js processes whenever they exit (e.g. when using
[Kubernetes](https://kubernetes.io/))

### Docker Secrets

As an alternative to passing sensitive information via environment variables, `_FILE` may be appended to some sensitive
environment variables, causing the initialization script to load the values for those variables from files present in
the container. In particular, this can be used to load passwords from Docker secrets stored in
`/run/secrets/<secret_name>` files. For example:

```console
docker run --name iotagent -e IOTA_AUTH_PASSWORD_FILE=/run/secrets/password -d iotagent4fiware/iotagent-aas
```

Currently, this `_FILE` suffix is supported for:

-   `IOTA_AUTH_USER`
-   `IOTA_AUTH_PASSWORD`
-   `IOTA_AUTH_CLIENT_ID`
-   `IOTA_AUTH_CLIENT_SECRET`
-   `IOTA_MONGO_USER`
-   `IOTA_MONGO_PASSWORD`

## Best Practices

### Increase ULIMIT in Docker Production Deployments

Default settings for ulimit on a Linux system assume that several users would share the system. These settings limit the
number of resources used by each user. The default settings are generally very low for high performance servers and
should be increased. By default, we recommend, that the IoTAgent - UL server in high performance scenarios, the
following changes to ulimits:

```console
ulimit -n 65535        # nofile: The maximum number of open file descriptors (most systems do not allow this
                                 value to be set)
ulimit -c unlimited    # core: The maximum size of core files created
ulimit -l unlimited    # memlock: The maximum size that may be locked into memory
```

If you are just doing light testing and development, you can omit these settings, and everything will still work.

To set the ulimits in your container, you will need to run IoTAgent - UL Docker containers with the following additional
--ulimit flags:

```console
docker run --ulimit nofile=65535:65535 --ulimit core=100000000:100000000 --ulimit memlock=100000000:100000000 \
--name iotagent -d iotagent4fiware/iotagent-aas
```

Since “unlimited” is not supported as a value, it sets the core and memlock values to 100 GB. If your system has more
than 100 GB RAM, you will want to increase this value to match the available RAM on the system.

> Note: The --ulimit flags only work on Docker 1.6 or later. Nevertheless, you have to "request" more resources (i.e.
> multiple cores), which might be more difficult for orchestrates ([Docker Engine](https://docs.docker.com/engine) or
> [Kubernetes](https://kubernetes.io)) to schedule than a few different containers requesting one core (or less...) each
> (which it can, in turn, schedule on multiple nodes, and not necessarily look for one node with enough available
> cores).

If you want to get more details about the configuration of the system and node.js for high performance scenarios, please
refer to the [Installation Guide](https://fiware-iotagent-ul.rtfd.io/en/latest/installationguide/index.html).

### Set-up appropriate Database Indexes

If using Mongo-DB as a data persistence mechanism (i.e. if `IOTA_REGISTRY_TYPE=mongodb`) the device and service group
details are retrieved from a database. The default name of the IoT Agent database is `iotagent_aas`. Database access can
be optimized by creating appropriate indices.

For example:

```console
docker exec  <mongo-db-container-name> mongo --eval '
    conn = new Mongo();
    db = conn.getDB("iotagentul");
    db.createCollection("devices");
    db.devices.createIndex({"_id.service": 1, "_id.id": 1, "_id.type": 1});
    db.devices.createIndex({"_id.type": 1});
    db.devices.createIndex({"_id.id": 1});
    db.createCollection("groups");
    db.groups.createIndex({"_id.resource": 1, "_id.apikey": 1, "_id.service": 1});
    db.groups.createIndex({"_id.type": 1});' > /dev/null
```

The name of the database can be altered using the `IOTA_MONGO_DB` environment variable. Alter the `conn.getDB()`
statement above if an alternative database is being used.
