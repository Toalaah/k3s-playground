# Simple Single-Node Kubernetes Setup (K3S)

Outlines the process of setting up a simple single-node cluster using k3s. This
repo primarily serves the purpose of documentation, storing various notes,
links, and code-snippets which I ~~found~~ find helpful while learning about
Kubernetes.

## Steps for Basic Setup

This setup will create and link a single-node k3s cluster to a remove VM. It
will also save the `kubeconfig` file to your local machine allowing you to
interact with the cluster without needing to remote into the server.

> **Note:** this was tested on a standard digital ocean droplet

1. Setup a VPS / server. Make sure that the ports 80, 443, and 6443 are open.
   On Ubuntu you can open a port with `sudo ufw allow 80/tcp` (or `udp`). The easiest
   way to do this is to install nginx and run the following as root.

   ```bash
    ufw allow 'Nginx Full'
    ufw allow 6443/tcp
    ufw enable
   ```

   Running `ufw status` as root should produce an output similar to the
   following (note that when enabling ufw you will also have to open port 22,
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

2. (Optional) create DNS entry pointing to IP of server

3. Download [k3sup](https://github.com/alexellis/k3sup)

   ```bash
   curl -sLS https://get.k3sup.dev | sh
   sudo install k3sup /usr/local/bin/
   ```

4. Install k3s to the server using either the `--ip` or `--host` flag,
   depending on whether or not you created a DNS entry. Note that this will
   overwrite your kubeconfig in `$HOME/.kube/config`.

   > **Note:** We will install k3s without the standard traefik ingress
   > as we will be manually adding an Nginx ingress controller later.

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

  > **Note:** You can copy ssh keys to a remote VM with `ssh-copy-id user@IP`

5. Ensure that the installation succeeded by running `kubectl get nodes`. You
   should something similar to the following output

    ```
    NAME            STATUS   ROLES                  AGE     VERSION
    k3s-master-01   Ready    control-plane,master   3h29m   v1.22.7+k3s1
    ```

