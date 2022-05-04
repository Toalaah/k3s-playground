# Demo K3s App

Demo Next.js application to have something to containerize and deploy.

## Use in Deployment

The latest image of this application can be found on [docker-hub](https://hub.docker.com/repository/docker/skunst/k3s-demo).

You can include it in a deployment manifest by including the following spec.

```yaml
spec:
  containers:
    - image: skunst/k3s-demo
      name: demo-app
      ports:
        - containerPort: 3000
```

You can also run it without having to clone this repo with the following command.

```bash
docker run -it -p 3000:3000 skunst/k3s-demo:latest
```

## Build Locally

The docker image for this application can be built by running the following
from **this directory**.

```bash
docker build -t k3s-demo .
```

It can then be run with the following command.

```bash
docker run -it -p 3000:3000 k3s-demo
```
