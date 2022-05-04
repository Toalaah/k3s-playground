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
1. [Setup NGINX Ingress Controller](#setup-nginx-ingress-controller)
1. [Setup Kubernetes Dashboard](#setup-kubernetes-dashboard)

## Initialize Cluster

[*📖 Back to Table of Contents*](#table-of-contents)

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
   export HOST="k8s.kunst.me"
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

[*📖 Back to Table of Contents*](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

  > 🤔 TODO

</details>

## Setup NGINX Ingress Controller

[*📖 Back to Table of Contents*](#table-of-contents)

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
  the following (Uptimes and IPs may of course be different).

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

</details>

## Setup Kubernetes Dashboard

[*📖 Back to Table of Contents*](#table-of-contents)

<details open>
<summary>Collapse Section</summary><br>

  > 🤔 TODO

</details>
