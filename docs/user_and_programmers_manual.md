## Connecting the AAS IoTAgent to an external AAS Server

In this section you find all what you need to know about linking the AAS IoTAgent to an external AAS Server.

## Step 1 - Configure the Agent

First of all, you have to inform the Agent of where it can find the AAS server. The URL of the server and all the other
required properties must be specified within config.js file.

Details about all the properties in config.js are explained in the [config.js](../conf/config.js) template.

![edit config.js](./images/AAS%20agent%20flow%20chart_1.png)

If you are using the dockerized version, you do not have to change the URL, we will see how to map that symbolic names
to actual IP addresses in the next section.

## Step 2 - Set AAS server URL

When using an external AAS Server the Agent (and the built-in mapping tool) needs to know the address of the aas-env
component of the AAS Server. You have to map the AAS Server address against two hostnames.

```yaml
services:
  iot-agent:
    ...
    enviroment:
      - "IOTA_AAS_ENDPOINT=${URL of the "aas-env" of the AAS server}"
    ...
```

The agent will contact this URL to fetch all the submodel on the AAS server

## Step 3 - Preparing the Agent for start up

AAS Agent is configurable through a single configuration file. All properties are explained in the
[config.js](../conf/config.js) template. If you are running the Agent using Docker, please use the environment variables
defined in the docker-compose example provided.

Main sections are:

-   `config.iota`: configure northbound (Context Broker), agent server, persistence (MongoDB), log level, etc.
-   `config.aas`: configure southbound (AAS endpoint)
-   `config.mappingTool`: configure mapping tool properties to set auto configuration

Three options are available to configure the Agent, described below.

#### Option 1: Auto configuration (usage of Mapping Tool)

When `config.configurationType` is `auto`, the Mapping Tool creates a mapping for all AAS objects (except those with
namespace to ignore matching). The configuration of the attribute will follow the value of a string AAS qualifier, calld
**isAttributeActive**, if the value of the qualifiers is 'true' then the attribute is set to _active_, otherwise, if the
qualifiers does not exists or is it 'false', the attribute will be set to _lazy_.

#### Option 2: Static configuration (editing config.js file)

When `config.configurationType` is `static`, it is possible to specify the mapping between AAS objects and NGSI
attributes and commands. The mapping can be specified in the config.js, editing the properties `types`, `contexts` and
`contextSubscriptions`.

To define active attributes:

-   set the active object in active section array of type object
-   set the mapping object in mappings array of contexts

To define lazy attributes:

-   set the lazy object in lazy section array of type object
-   set the mapping object in mappings array of contextSubscriptions (set object_id to null and inputArguments to empty
    array)

An example can be found [here](../conf/config-v2.example.js).

#### Option 3: Dynamic configuration (REST API)

When `config.configurationType` is `dynamic`, you can use the REST interface to setup the Agent once it has started.

## Step 4 - Run the Agent

Assuming the AAS Server is running, execute:

```bash
cd docker
docker-compose up -d
```
