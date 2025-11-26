## How to build a Docker image

Building a new Docker image for the OPC-UA IotAgent can be useful if you want to integrate your changes autonomously.

```bash
cd iotagent-opcua/docker
docker build -t <registry-name/hub-user>/<repo-name>:<version-tag> .

Example:
docker build -t johndoe/opcuaDoeAgent:1.0 .
```
