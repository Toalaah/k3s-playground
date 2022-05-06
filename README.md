# Simple Single-Node Kubernetes Setup (K3s)

Outlines the process of setting up a simple single-node cluster using
[K3s](https://k3s.io). This repo primarily serves the purpose of documentation;
storing various notes, links, and code-snippets which I ~~found~~ find helpful
while learning about Kubernetes. I plan to grow this readme over time by adding
the steps I took while setting up a cluster (mainly so that I don't forget half
of the things I did in a couple weeks time).

> **Note:** This is all tested on a standard DigitalOcean droplet. No
> guarantees for other providers, but the process should translate mostly
> one-for-one.


## Table of Contents

1. [Initialize Cluster](#initialize-cluster)
1. [Create a Demo Deployment](#demo-deployment)
1. [NGINX Ingress Controller](#nginx-ingress-controller)
1. [TLS Certificates](#tls)
    1. [Staging](#tls-certificate---staging)
    1. [Production](#tls-certificate---production)
1. [Kubernetes Dashboard](#kubernetes-dashboard)
1. [Persistent Storage](#persistent-storage)

## Initialize Cluster

[📖 *Back to Table of Contents*](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will create and link a single-node K3s cluster to a remove
VM. It will also save the `kubeconfig` file to your local machine allowing you
to interact with the cluster without needing to remote into the server.

1. Setup a VPS / server. Make sure that the ports 80, 443, and 6443 are open.
   On Ubuntu you can open a port with `sudo ufw allow {PORT}/tcp` (or `udp`). The easiest
   way to do this is to install NGINX and run the following as root.

   ```bash
    ufw allow 'Nginx Full'
    ufw allow 6443/tcp
    ufw enable
   ```

   Running `ufw status` as root should produce an output similar to the
   following (note that when enabling `ufw` you will also have to open port 22,
   otherwise you will not be able to remote into the saver on your next
   session.

    ```
    Status: active

    To                         Action      From
    --                         ------      ----
    6443/tcp                   ALLOW       Anywhere
    22/tcp                     ALLOW       Anywhere
    Nginx Full                 ALLOW       Anywhere
    6443/tcp (v6)              ALLOW       Anywhere (v6)
    22/tcp (v6)                ALLOW       Anywhere (v6)
    Nginx Full (v6)            ALLOW       Anywhere (v6)
    ```

1. (Optional) create DNS entry pointing to IP of server.

1. Download and install [k3sup](https://github.com/alexellis/k3sup)

   ```bash
   curl -sLS https://get.k3sup.dev | sh
   sudo install k3sup /usr/local/bin/
   ```

1. Install K3s to the server using either the `--ip` or `--host` flag,
   depending on whether or not you created a DNS entry. Note that this will
   overwrite your kubeconfig in `$HOME/.kube/config`.

   > **Note:** We will install K3s without the standard Traefik ingress
   > as we will be manually adding an NGINX ingress controller later.

   ```bash
   # if DNS record was setup (replace host appropriately)
   export HOST="k8s.example.com"
   k3sup install --host $HOST\
    --ssh-key $HOME/.ssh/path/to/key\
    --k3s-extra-args '--no-deploy traefik --write-kubeconfig-mode 644 --node-name k3s-master-01'\
    --local-path $HOME/.kube/config

   # if no DNS record was setup (replace ip appropriately)
   export IP="192.168.0.1"
   k3sup install --ip $IP\
    --ssh-key $HOME/.ssh/path/to/key\
    --k3s-extra-args '--no-deploy traefik --write-kubeconfig-mode 644 --node-name k3s-master-01'\
    --local-path $HOME/.kube/config
   ```

    > **Note:** You can copy ssh keys to a remote VM with `ssh-copy-id user@IP`.

1. Ensure that the installation succeeded by running `kubectl get nodes`. You
   should something similar to the following output.

    ```
    NAME            STATUS   ROLES                  AGE     VERSION
    k3s-master-01   Ready    control-plane,master   3h29m   v1.22.7+k3s1
    ```
</details>

## Demo Deployment

[📖 *Back to Table of Contents*](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will be deploying the demo Next.js application found
[here](./demo-app/README.md). We will create a deployment with 2 replicas along
with a service in order to allow us to assign network policies / ingresses to
the pods. This will all be created in a namespace `demo`, allowing us to clean
up more easily afterwards

The manifest [`demo-app.yml`](./demo-app.yml) is comprised of the following parts:

1. A namespace specification. This will create the namespace `demo` if it does
   not yet exist

1. The deployment specification. This will create a deployment with 2 container
   replicas running the demo [Next.js](./demo-app/README.md) application.

   > **Note:** feel free to swap this image out with any other image you
   > preference. It will, by default, search the docker registry so make sure
   > that it can be found there. You might also need to change the container
   > port in the deployment specification.

1. The service specification. This will allow us to interface with the pods.

   > **Note:** the target port must match the container port specified in the
   > deployment block. If you changed the image, you might need to amend this
   > in the service as well.

1. The ingress specification. This manages exernal access to the service.

Deploying this is as easy as running the following command

```bash
kubectl apply -f demo-app.yml
```

You should see the following output

```
namespace/demo created
deployment.apps/k3s-demo created
service/svc-k3s-demo created
ingress.networking.k8s.io/ingress-k3s-demo created
```

You can verify the status of the pods, services, and ingresses by running
`kubectl get all,ingress -n demo`. The output should be similar to the
following (uptimes and IPs may of course be different).

```
NAME                            READY   STATUS    RESTARTS   AGE
pod/k3s-demo-69d5ffc6c8-g8986   1/1     Running   0          11m
pod/k3s-demo-69d5ffc6c8-bpjqd   1/1     Running   0          11m

NAME                   TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/svc-k3s-demo   ClusterIP   10.43.74.130   <none>        80/TCP    11m

NAME                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/k3s-demo   2/2     2            2           11m

NAME                                  DESIRED   CURRENT   READY   AGE
replicaset.apps/k3s-demo-69d5ffc6c8   2         2         2       11m

NAME                                         CLASS    HOSTS   ADDRESS         PORTS   AGE
ingress.networking.k8s.io/ingress-k3s-demo   <none>   *       192.168.0.1     80      11m
```

You may notice that you cannot access the application when visiting the IP of
the remote machine. This is because we need to add an ingress controller which
will route external traffic to the demo application service.

</details>

## NGINX Ingress Controller

[📖 *Back to Table of Contents*](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

  In this section we will go through adding an ingress controller to our
  cluster. This can trivially be done in a single line using the official
  [NGINX ingress controller](https://kubernetes.github.io/ingress-nginx/). We
  will not require any special modifications for now so all we need to run is
  the following `kubectl` command.

  ```bash
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.2.0/deploy/static/provider/cloud/deploy.yaml
  ```

  Running `kubectl get all -n ingress-nginx` should produce an ouput similar to
  the following (uptimes and IPs may of course be different).

  ```
  NAME                                            READY   STATUS      RESTARTS   AGE
  pod/svclb-ingress-nginx-controller-6zq8m        2/2     Running     0          23h
  pod/ingress-nginx-admission-patch--1-z6jht      0/1     Completed   0          23h
  pod/ingress-nginx-admission-create--1-ff5l2     0/1     Completed   0          23h
  pod/ingress-nginx-controller-5849c9f946-b5xdf   1/1     Running     0          23h

  NAME                                         TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)                      AGE
  service/ingress-nginx-controller             LoadBalancer   10.43.126.96    192.168.0.1     80:32684/TCP,443:31269/TCP   23h
  service/ingress-nginx-controller-admission   ClusterIP      10.43.145.226   <none>          443/TCP                      23h

  NAME                                            DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
  daemonset.apps/svclb-ingress-nginx-controller   1         1         1       1            1           <none>          23h

  NAME                                       READY   UP-TO-DATE   AVAILABLE   AGE
  deployment.apps/ingress-nginx-controller   1/1     1            1           23h

  NAME                                                  DESIRED   CURRENT   READY   AGE
  replicaset.apps/ingress-nginx-controller-5849c9f946   1         1         1       23h
  replicaset.apps/ingress-nginx-controller-7566fdb978   0         0         0       23h

  NAME                                       COMPLETIONS   DURATION   AGE
  job.batch/ingress-nginx-admission-patch    1/1           6s         23h
  job.batch/ingress-nginx-admission-create   1/1           7s         23h
  ```

You should now be able to access your deployment by visiting either the IP /
URL of the server. You should notice that when visiting the site using HTTPS /
forcing port `443` the app **does** have a TLS certificate; however it is
self-signed, causing your browser to not trust it by default. In the [next
section](#tls), we will be adding a certificate manager and cluster issuer
which will automatically provision our app with a certificate from lets-encrypt
using [cert-manager](https://cert-manager.io/).

</details>

## TLS

[📖 *Back to Table of Contents*](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will be adding TLS to our demo deployment. We will use
[cert-manager](https://cert-manager.io/) to obtain and distribute TLS
certificates.

### TLS Certificate - Staging

You can setup both the staging cluster issuer and certificate by getting the
official cert-manager manifest and then applying the manifests in
`./tls-manager/staging/`

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.0/cert-manager.yaml
kubectl apply -f ./tls-manager/staging/cluster-issuer-staging.yml
kubectl apply -f ./tls-manager/staging/cert-staging.yml
```

We then need to register the created certificate secret in our demo
application. To do this, either apply the TLS-version of the deployment with
`kubectl apply -f ./tls-manager/staging/demo-app-tls-staging.yml` or manually
add the secret / annotation to the ingress (changing the host appropriately).

> **Note:** if you only have an IP address you may have to use a service such
> as [nip.io](https://nip.io/) in order for K3s to consider the host valid.

```yaml
# ...
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-k3s-demo
  namespace: demo
  annotations:
    kubernetes.io/ingress.class: nginx
     # ⬇️ add this annotation
    cert-manager.io/cluster-issuer: 'letsencrypt-staging'
spec:
  # ⬇️ add this tls spec (change host accordingly)
  tls:
    - hosts:
      - k8s.kunst.me
      secretName: tls-staging
  rules:
  # ⬇️ add the same host to spec rules
  - host: k8s.kunst.me
    http:
      paths:
      - path: /
        pathType: ImplementationSpecific
        backend:
          service:
            name: svc-k3s-demo
            port:
              number: 80
# ...
```

After a few minutes the certificate should be applied. You can verify the
success of this step by visitng the deployment and checking the certificate.

**Note:** staging certificates will still show as untrusted on browsers.

### TLS Certificate - Production

Assigning a production certificate to your service is just as straight-forward
as when using a staging-certificate. In fact, all you need to do is change all
the instances of `letsencrypt-staging` / `tls-staging` to
`letsencrypt-production` and `tls-production` respectively.

```bash
# ⬇️ apply this if you haven't already, otherwise skip this
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.0/cert-manager.yaml
kubectl apply -f ./tls-manager/production/cluster-issuer-production.yml
kubectl apply -f ./tls-manager/production/cert-production.yml
```

Then either change the ingress in the deployment manifest manually just like in
the code-snippet above or apply the production-tls-version of the demo app with
`kubectl apply -f ./tls-manager/production/demo-app-tls-production.yml`

</details>

## Kubernetes Dashboard

[📖 *Back to Table of Contents*](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will be adding the [kubernetes
dashboard](https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/).
It provides a nice way to oversee your cluster and quickly manage / debug pods.
We will be deploying the dashboard to the path `/dashboard`, although this is
configurable to your liking by changing the path / annotations in the
[`dashboard/dashboard-ingress.yml`](./dashboard/dashboard-ingress.yml) file.

> **Note:** the dashboard is **only** accessible via SSL (HTTPS), so you must
> ensure you have some sort of infrastructure setup to issue and provision SSL
> certs to namespaces as described in the [TLS section](#tls) above.

Setting up the dashboard is actually quite straightforward. We will require no
modifications to the service / pods, so we can deploy the standard AIO
dashboard as follows

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.5.0/aio/deploy/recommended.yaml
```

We will then deploy the RBAC ([role-based access
control](https://kubernetes.io/docs/reference/access-authn-authz/rbac/))
config. This will allow us to later login to the dashboard using an admin
token

```bash
kubectl -n kubernetes-dashboard apply -f ./dashboard/dashboard-roles.yml
```

Finally all that is left is to create an SSL-secret in the
`kubernetes-dashboard` namespace and apply the ingress configuration. **Keep in
mind** that the sample files in [`./dashboard`](./dashboard) all point to
`k8s.kunst.me`, so you ~~may want to~~ should change the hosts to suit your
needs.

> **Note:** the secret / ingress use production certificates from LetsEncrypt.
> It is advised to test this with staging certs first as to avoid hitting
> LetsEncrypt's rate-limit should any problems come up.

```bash
kubectl -n kubernetes-dashboard apply -f ./dashboard/dashboard-tls-production.yml
kubectl -n kubernetes-dashboard apply -f ./dashboard/dashboard-ingress.yml
```

You can now get a admin-user token with this "one-liner" (requires either pbcopy or xclip to be installed)

```bash
TOKEN=$(kubectl -n kubernetes-dashboard describe secret admin-user-token | grep ^token | awk '{print $2}'); echo "$TOKEN" | pbcopy 2>/dev/null || echo "$TOKEN" | xclip -sel in 2>/dev/null; echo "Token copied to clipboard"
```

If you prefer not to use over-engineered solutions you can, of course, also
just print the token and then copy it manually with `kubectl -n
kubernetes-dashboard describe secret admin-user-token | grep ^token | awk
'{print $2}'`

</details>

## Persistent Storage

[📖 *Back to Table of Contents*](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

  > 🤔 TODO

</details>

