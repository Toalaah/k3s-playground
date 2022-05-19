# Simple Single-Node Kubernetes Setup (K3s)

Step by step guide on setting up a simple single-node cluster using
[K3s](https://k3s.io).

---

This repo primarily serves the purpose of documentation; storing various notes,
links, and code-snippets which I ~~found~~ find helpful while learning about
Kubernetes.

I plan to grow this readme over time by adding the steps I took while setting
up a cluster (mainly so that I don't forget half of the things I did in a
couple weeks time). It may therefore still be quite primitive and mistakes are
likely.

> ⚠️ **Note:** This guide was "tested" once on a standard DigitalOcean droplet and
> once on a Contabo VPS. No guarantees for other providers, but the process
> should translate mostly one-for-one.

## Table of Contents

1. [Initialize Cluster](#initialize-cluster)
1. [Add the NGINX Ingress Controller](#nginx-ingress-controller)
1. [Create a Demo Deployment](#demo-deployment)
1. [TLS Certificates](#tls)
   1. [Staging](#certificate-issuer---staging)
   1. [Production](#certificate-issuer---production)
   1. [Wildcard Certificates](#wildcard-certificates)
1. [Kubernetes Dashboard](#kubernetes-dashboard)
1. [Persistent Storage](#persistent-storage)
1. [Keycloak](#keycloak)
1. [Storage Bucket](#storage-bucket)
1. [Snippets](#snippets)

## Initialize Cluster

[📖 _Back to Table of Contents_](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will create and link a single-node K3s cluster to a remote
VPS using an awesome K3s provisioning tool called
[k3sup](https://github.com/alexellis/k3sup). This tool will automatically save
the [`kubeconfig`](https://rancher.com/docs/rke/latest/en/kubeconfig/) file to
your local machine allowing you to interact with the cluster without needing to
remote into the server.

1.  Setup a VPS / server. Make sure that the ports 80, 443, and 6443 are open.
    On Ubuntu you can open a port with `sudo ufw allow {PORT}/tcp` (or `udp`).
    The easiest way to do this is to install NGINX and run the following as
    root **on the server**.

    ```bash
     ufw allow 'Nginx Full'
     ufw allow 6443/tcp
     # if you plan on using ssh, don't forget to allow 22/tcp, otherwise you
     # will not be able to remote in on your next session!
     ufw allow 22/tcp
     ufw enable
    ```

    Running `ufw status` as root should produce an output similar to the
    following.

    ```
    Status: active

    To                         Action      From
    --                         ------      ----
    Nginx Full                 ALLOW       Anywhere
    6443/tcp                   ALLOW       Anywhere
    22/tcp                     ALLOW       Anywhere
    Nginx Full (v6)            ALLOW       Anywhere (v6)
    6443/tcp (v6)              ALLOW       Anywhere (v6)
    22/tcp (v6)                ALLOW       Anywhere (v6)
    ```

1.  (Optional) create DNS entry pointing to IP of server.

1.  On your **local machine**, download and install
    [k3sup](https://github.com/alexellis/k3sup)

    ```bash
    curl -sLS https://get.k3sup.dev | sh
    sudo install k3sup /usr/local/bin/
    ```

1.  From your **local machine**, provision K3s on the server using either the
    `--ip` or `--host` flag, depending on whether or not you created a DNS
    entry. The installation may take several minutes and hang at times, but it
    should eventually go through after anywhere between 1-5mins.

    > ⚠️ **Note:** We will install K3s without the standard Traefik ingress
    > as we will be manually adding an NGINX ingress controller later.

    ```bash
    # if DNS record was setup (replace host + ssh key appropriately)
    export HOST="example.com"
    k3sup install --host $HOST\
     --ssh-key $HOME/.ssh/path/to/private/key\
     --k3s-extra-args '--no-deploy traefik --write-kubeconfig-mode 644 --node-name k3s-master-01'\
     --local-path $HOME/.kube/config

    # if no DNS record was setup (replace ip + ssh key appropriately)
    export IP="192.168.0.1"
    k3sup install --ip $IP\
     --ssh-key $HOME/.ssh/path/to/private/key\
     --k3s-extra-args '--no-deploy traefik --write-kubeconfig-mode 644 --node-name k3s-master-01'\
     --local-path $HOME/.kube/config
    ```

    > ⚠️ **Note:** You can copy SSH keys to a remote VM with `ssh-copy-id user@IP`.

1.  Ensure that the installation succeeded by running `kubectl get nodes`. You
    should something similar to the following output.

        ```
        NAME            STATUS   ROLES                  AGE   VERSION
        k3s-master-01   Ready    control-plane,master   48s   v1.23.6+k3s1
        ```

    </details>

## NGINX Ingress Controller

[📖 _Back to Table of Contents_](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will go through adding an ingress controller to our cluster.
We require this ingress controller in order to later pass on user traffic to
the relevant services so that they are externally accessible. This can
trivially be done in a single line using the official [NGINX ingress
controller](https://kubernetes.github.io/ingress-nginx/). We will not require
any special modifications for now so all we need to run is the following
`kubectl` command.

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.2.0/deploy/static/provider/cloud/deploy.yaml
```

Running `kubectl -n ingress-nginx get all` should produce an output similar to
the following (uptimes and IPs may of course be different).

```
NAME                                            READY   STATUS      RESTARTS   AGE
pod/svclb-ingress-nginx-controller-2kf7s        2/2     Running     0          51m
pod/ingress-nginx-admission-create-qd8p7        0/1     Completed   0          51m
pod/ingress-nginx-admission-patch-fmsvc         0/1     Completed   1          51m
pod/ingress-nginx-controller-7575567f98-5hk5h   1/1     Running     0          51m

NAME                                         TYPE           CLUSTER-IP      EXTERNAL-IP       PORT(S)                      AGE
service/ingress-nginx-controller-admission   ClusterIP      10.43.145.130   <none>            443/TCP                      51m
service/ingress-nginx-controller             LoadBalancer   10.43.139.24    185.245.182.194   80:30187/TCP,443:31874/TCP   51m

NAME                                            DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemonset.apps/svclb-ingress-nginx-controller   1         1         1       1            1           <none>          51m

NAME                                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/ingress-nginx-controller   1/1     1            1           51m

NAME                                                  DESIRED   CURRENT   READY   AGE
replicaset.apps/ingress-nginx-controller-7575567f98   1         1         1       51m

NAME                                       COMPLETIONS   DURATION   AGE
job.batch/ingress-nginx-admission-create   1/1           10s        51m
job.batch/ingress-nginx-admission-patch    1/1           11s        51m
```

As soon as all the pods and services are ready and / or compelted we can move
on to our first demo deployment.

</details>

## Demo Deployment

[📖 _Back to Table of Contents_](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will be deploying the demo Next.js application found
[here](./demo-app/README.md) to the cluster. We will create a **deployment**
with 2 replicas. Furthermore we will deploy a a **service** alongside these
pods in order to manage / provide an interface to the pods. Finally, we will
deploy an **ingress** controller which will be responsible for routing traffic
to the service

The manifest [`demo-app.yml`](./demo-app.yml) is comprised of the following
parts / blocks:

1. The deployment specification. This will create a deployment with 2 container
   replicas running the demo [Next.js](./demo-app/README.md) application.

   > ⚠️ **Note:** feel free to swap this image out with any other image you
   > preference. It will, by default, search the docker registry so make sure
   > that it can be found there.
   >
   > You may also need to change the container. If this is the case, don't
   > forget to update the target port in the service respectively!

1. The service specification. This will allow us to interface with the pods.

   > ⚠️ **Note:** the target port must match the container port specified in the
   > deployment block. If you changed the image, you might need to amend this
   > in the service as well.

1. The ingress specification. This manages exernal access to the service.

Before deploying, make sure that you change the host in the ingress object to
point to your server.

> ⚠️ **Note:** if you only have an IP address you may have to use a service such
> as [nip.io](https://nip.io/) in order for K3s to consider the host valid.

Afterwards, deploying is as easy as running the following commands

```bash
kubectl create ns demo
kubectl -n demo apply -f demo-app.yml
```

You should see the following output

```
namespace/demo created

deployment.apps/k3s-demo created
service/svc-k3s-demo created
ingress.networking.k8s.io/ingress-k3s-demo created
```

You can verify the status of the pods, services, and ingresses by running
`kubectl -n demo get all,ingress`. The output should be similar to the
following (uptimes, IPs, and hosts may of course be different).

```
NAME                            READY   STATUS    RESTARTS   AGE
pod/k3s-demo-69b56c77d6-bmjq9   1/1     Running   0          37m
pod/k3s-demo-69b56c77d6-wvlxq   1/1     Running   0          37m

NAME                   TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/svc-k3s-demo   ClusterIP   10.43.39.125   <none>        80/TCP    42m

NAME                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/k3s-demo   2/2     2            2           42m

NAME                                  DESIRED   CURRENT   READY   AGE
replicaset.apps/k3s-demo-69b56c77d6   2         2         2       37m
replicaset.apps/k3s-demo-55bd46568d   0         0         0       42m

NAME                                         CLASS    HOSTS          ADDRESS           PORTS   AGE
ingress.networking.k8s.io/ingress-k3s-demo   <none>   k8s.kunst.me   185.245.182.194   80      42m
```

You should now be able to access your deployment by visiting either the IP /
URL speficied in the ingress object.

You will notices that the app **does** have a TLS certificate; however it is a
self-signed one created by K3s which your browser will not trust by default. In
fact, I was not even given the option to access the site despite these warnings
using Google Chrome! I had to use Safari in order to bypass the warnings shown
by the browser. This is obviously not ideal!

In the [next section](#tls), we will be adding a certificate manager and
cluster issuer which will automatically provision our app with a certificate
from lets-encrypt using [cert-manager](https://cert-manager.io/).

</details>

## TLS

[📖 _Back to Table of Contents_](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will be adding TLS to our demo deployment. We will use
[cert-manager](https://cert-manager.io/) to obtain and distribute TLS
certificates. There are two steps we need to take in order to obtain SSL
certificates for our deployment which the browser will trust.


First, install cert manager to the cluster.

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.0/cert-manager.yaml
```

Next, we need to setup and create a
[ClusterIssuer](https://cert-manager.io/docs/concepts/issuer/), a CA resource
which can provision valid signed SSL certificates. We will create 2 Issuers,
one for **staging** certificates and one for **production** certificates. We do
this as it is advised to test your deployments with staging certificates before
switching to production ones due to LetsEncrypt enforcing rather strict
rate-limiting.

### Certificate Issuer - Staging

First, setup the staging cluster issuer by applying the file
[`./tls-manager/issuer/staging.yml`](./tls-manager/issuer/staging.yml).

> ⚠️ **Note:** make sure to change the email in the file accordingly!

```bash
kubectl apply -f ./tls-manager/issuer/staging.yml
```

You can check the status of the issuer by running `kubectl describe
ClusterIssuers letsencrypt-staging`. If all went well, you should see the
following

```
# ...
Status:
  # ...
  Conditions:
    Last Transition Time:  2022-05-09T13:31:39Z
    Message:               The ACME account was registered with the ACME server
    Observed Generation:   1
    Reason:                ACMEAccountRegistered
    Status:                True
    Type:                  Ready
Events:                    <none>
```

We are now ready to create our first certificate. For now, we will create a
staging certificate and deploy it to the `demo` namespace we created earlier.
All we need to do in order to create this certificate is to apply the file
[`./tls-manager/certificates/staging.yml`](./tls-manager/certificates/staging.yml)
to the `demo` namespace.

> ⚠️ **Note:** make sure to change the common / dns name in the file accordingly!
> It should match the host specified in the ingress you applied while deploying
> the demo app.

```bash
kubectl -n demo apply -f ./tls-manager/certificates/staging.yml
```

You can check the status of the certificate by running `kubectl -n demo get
Certificate`. The creation process should take about a minute to complete.


We then need to register the created certificate secret in our demo
application. To do this, simply apply the add the secret / annotation to the
ingress in [`./demo-app.yml`](./demo-app.yml) (changing the host
appropriately).

```yaml
# ...
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-k3s-demo
  namespace: demo
  annotations:
    kubernetes.io/ingress.class: nginx
    # ⬇️ add this annotation (change to "letsencrypt-production" for prod cert)
    cert-manager.io/cluster-issuer: "letsencrypt-staging"
spec:
  # ⬇️ add this tls spec (change host accordingly)
  tls:
    - hosts:
        - k8s.kunst.me
  #   ⬇️ use "tls-production" for prod cert
      secretName: tls-staging
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: svc-k3s-demo
                port:
                  number: 80
# ...
```

After a few minutes the certificate should be applied. You can verify the
success of this step by visitng the deployment and checking the certificate. It
should **still** be marked as untrusted, but the certificate-name(s) should be
along the lines of "Artificial Apricot" or "Pretend Pear".

### Certificate Issuer - Production

After verifying that the staging certificates were correctly applied you should
be able to just as easily create a production-grade TLS certificate for the
demo-deployment. The steps are analogous to the previous section, so we will
only briefly summarize the main points.

```bash
# create certificate cluster-issuer
kubectl apply -f ./tls-manager/issuer/production.yml

# create prod certificate for demo namespace
kubectl -n demo apply -f ./tls-manager/certificates/production.yml
```

Then replace the TLS spec and annotation we just added with the
production-variants as described in the code-snippet above.

Finally, reapply the deployment and wait a minute or so for the certificate to
be created and applied. If all went well, the certificate should now be trusted
by your browser.

### Wildcard Certificates

> 🤔 TODO
<!-- https://cert-manager.io/docs/faq/sync-secrets/#using-reflector -->

</details>

## Kubernetes Dashboard

[📖 _Back to Table of Contents_](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will be adding the [kubernetes
dashboard](https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/).
It provides a nice way to oversee your cluster and quickly manage / debug pods.
We will be deploying the dashboard to the path `/dashboard`, although this is
configurable to your liking by changing the path / annotations in the
[`dashboard/ingress.yml`](./dashboard/ingress.yml) file.

> ⚠️ **Note:** the dashboard is **only** accessible via SSL (HTTPS), so you must
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
kubectl -n kubernetes-dashboard apply -f ./dashboard/roles.yml
```

Finally all that is left is to create an ingress controller and TLS certificate
in order to allow secure external traffic to access the dashboard.

```bash
kubectl -n kubernetes-dashboard apply -f ./tls-manager/certificates/production.yml
kubectl -n kubernetes-dashboard apply -f ./dashboard/ingress.yml
```

You can now get a admin-user token with this "one-liner" (requires either
pbcopy or xclip to be installed)

```bash
TOKEN=$(kubectl -n kubernetes-dashboard describe secret admin-user-token | grep ^token | awk '{print $2}'); echo "$TOKEN" | pbcopy 2>/dev/null || echo "$TOKEN" | xclip -sel in 2>/dev/null; echo "Token copied to clipboard"
```

If you prefer not to use over-engineered solutions you can, of course, also
just print the token and then copy it manually with `kubectl -n
kubernetes-dashboard describe secret admin-user-token | grep ^token | awk
'{print $2}'`

Then, visit the dashboard at the host / path which you specified. Note that if
you get a blank screen, you may need to add the suffix `/#/login` to the URL in
order for the auth-UI to show up.

</details>

## Persistent Storage

[📖 _Back to Table of Contents_](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

1. Install [longhorn](https://github.com/longhorn/longhorn) by applying the
   official manifest

   ```bash
   kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/master/deploy/longhorn.yaml
   ```

1. Wait until the deployment is finished / all pods have spun up (this may take
   a couple of minutes). You can check the status by running `kubectl -n
   longhorn-system get all`.

  > ⚠️ **Note:** If your longhorn manager is crashlooping it may be due to a
  > missing dependency `open-iscsi`. Try running `apt-get update; apt-get
  > install open-iscsi` on the server as a possible fix. 
  >
  > Otherwise, you can always inspect the container logs by running `kubectl -n
  > longhorn-system logs pods/<pod-name>`

  If everything went as planned, you should see the following output when
  running `kubectl get storageclass`.

   ```
   NAME                   PROVISIONER             RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
   local-path (default)   rancher.io/local-path   Delete          WaitForFirstConsumer   false                  3d6h
   longhorn (default)     driver.longhorn.io      Delete          Immediate              true                   5m12s
   ```

1. Deploy the database to the `demo` namespace. This will create a **service**,
   **volume claim**, and **deployment** for the database.

    ```bash
    kubectl -n demo apply -f ./demo-app-db.yml
    ```

1. We can now deploy a version of the demo-app which contains the database
   credentials on top of the existing deployment. To do this, simply add the
   environment variables as a secret and specify them in the container (they
   are already commented out in the demo app [manifest](./demo-app.yml)

    ```yaml
    # ⬇️ add this secret
    apiVersion: v1
    kind: Secret
    metadata:
      name: demo-app-secrets
    type: Opaque
    data:
      # Note: these secrets are base-64 encoded. To get the base-64 repr of a
      # string, run `echo -n "SECRET-HERE" | base64`
      username: cG9zdGdyZXM=
      password: cG9zdGdyZXM=
      db: ZGI=
      db-url: cG9zdGdyZXNxbDovL3Bvc3RncmVzOnBvc3RncmVzQGRlbW8tYXBwLWRiLXNlcnZpY2U6NTQzMi9kYj9zY2hlbWE9cHVibGlj
    # ...
    # ⬇️ add these environment variables to spec.template.spec.containers[0] in the deployment object
    env:
      # value must match of the service in ./demo-app-db.yml
      - {name: DB_HOST, value: demo-app-db-service}
      - {name: DB_USER, valueFrom: {secretKeyRef: {name: demo-app-secrets, key: username}}}
      - {name: DB_PASS, valueFrom: {secretKeyRef: {name: demo-app-secrets, key: password}}}
      - {name: DB_NAME, valueFrom: {secretKeyRef: {name: demo-app-secrets, key: db}}}
      - {name: DATABASE_URL, valueFrom: {secretKeyRef: {name: demo-app-secrets, key: db-url}}}
    #...
    ```

    > ⚠️ **Note:** The env entries do not **need** to be minified, this was just
    done to retain readability

  All that is now left is to re-deploy and wait for the pods to spin up.

   ```bash
   kubectl -n demo apply -f ./demo-app.yml
   ```

</details>

## Keycloak

[📖 _Back to Table of Contents_](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will be setting up a [Keycloak](https://www.keycloak.org/)
instance with persistent storage. Keycloak is an open source identtity / access
management application providing a simple way to authenticate users securlely
using the standard OIDC protocol.


> ⚠️ **Note:** The environment variables are written in plaintext in the
> Keycloak manifests for **demonstartion** purposes only. It is **highly**
> recommended that you create a seperate secrets object storing all the
> required credentials and deploying it you your namespace, then using secret
> key refs instead (see the code snippet in the [persistent
> storage](#persistent-storage) section for an example).

1. First, create a namespace called `keycloak` with `kubectl create ns
   keycloak`

1. Now, we use what we learned in the section on [persistent
   storage](#persistent-storage) to create a postgres service with a persistent
   volume claim.

   ```bash
    kubectl -n keycloak apply -f ./keycloak/db.yml
   ```

   Wait until the service is initialized. You can check the status by running a
   simply `kubectl -n keycloak get pods`. Once the pods have a status of
   "READY" we can continue.

1. We can now apply the deployment file. We will be using the
   `quay.io/keycloak/keycloak` variant of Keycloak for this demonstration.

   ```bash
    kubectl -n keycloak apply -f ./keycloak/deployment.yml
   ```

   Wait for the Keycloak pod to be ready. This may take one or two minutes as
   the container is quite large, and as such, required some time to initialize.

    > ⚠️ **Note:** You may find it helpful to periodically check the logs of the
    > pods to check for any database connection issues or similar. However, if
    > you use the provided manifests, they \*should\* work
    > **#itworksonmycluster** **#tryturningitoffandonagain**


1. Once both the deployments are up and running we can move on to creating an
   ingress object pointing to the Keycloak service as well as a corresponding
   certificate. Make sure to change the hostname accordingly.

   ```bash
    kubectl -n keycloak apply -f ./keycloak/ingress.yml
    kubectl -n keycloak apply -f ./keycloak/cert.yml
   ```

    > ⚠️ **Note:** The example ingress object uses the subdomain `keycloak`.
    > This will only work if you also point `keycloak.<your-domain>` to the
    > cluster (or alternatively `*.<your-domain>`). Otherwise you may need to
    > use paths (see the code snippet in the [kubernetes
    > dashboard](#kubernetes-dashboard) section for an example)

</details>

## Storage Bucket

[📖 _Back to Table of Contents_](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

In this section we will be setting up an storage bucket using
[MinIO](https://min.io/). MinIO makes it easy to quickly setup S3 compatible
object storage and even provides a nice web-ui to interface with out of the
box.

1. First, we create a new namespace and inject a secret object containing all
   the credentials we need for our deployment.

   ```bash
    kubectl create namespace minio
    cat << EOF | kubectl -n minio apply -f -
    apiVersion: v1
    kind: Secret
    metadata:
      name: minio-secret
    type: Opaque
    data:
      minio-user: $(echo -n "secure-username-here" | base64 -w0)
      minio-password: $(echo -n "secure-password-here" | base64 -w0)
    EOF
   ```

1. Next, we apply the deployment file to the namespace. This will also create a
   persistent volume claim so that the deployment can retain state after new
   rollouts. Ensure that the deployment and PVC are ready by checking their
   status using `kubectl -n minio get deployment,pvc`.

   ```bash
    kubectl -n minio apply -f ./minio/deployment.yml
   ```

1. Now create a service which allows us to expose both the MinIO api
   and web-ui.

   ```bash
    kubectl -n minio apply -f ./minio/service.yml
   ```
    > ⚠️ **Note:** If you do not wish to expose the web-console, remove the port
    > entry pointing to 9001 from the service (or you could omit the ingress
    > route later on, either will work)


1. All that is left now is to create an ingress object and optionally generate
   TLS certificates. You can find both the required files in the
   [`minio`](./minio) folder.

    > ⚠️ **Note:** Make sure to change the host names appropriately! If you only
    > wish to expose the API or altered the service in the previous step,
    > remember to remove the host entry pointing to port `9001` of the
    > `minio-service`.

   ```bash
    kubectl -n minio apply -f ./minio/cert.yml
    kubectl -n minio apply -f ./minio/ingress.yml
   ```

</details>

## Snippets

[📖 _Back to Table of Contents_](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

> 🤔 TODO

</details>
