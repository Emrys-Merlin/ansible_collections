# My Ansible Collections

I use ansible to orchestrate my servers for private projects. In particular, I often use raspberry pis or [uberspace](https://uberspace.de/en/) to host my services. Here, I collect the roles that I find useful. They are not polished. So, please proceed with caution 🙂

## Collections

There are two collections `emrys_merlin.rpi`, containing all raspberry pi-specific roles, and `emrys_merlin.uberspace`, containting all uberspace-specific roles.

### `emrys_merlin.rpi`

- [`docker`](./ansible_collections/emrys_merlin/rpi/roles/docker/): This role installs docker, adds the user to the docker group, and logs into the [github container registry](ghcr.io)
- [`hdd`](./ansible_collections/emrys_merlin/rpi/roles/hdd/): This role creates an encrypted partition on a drive connected to the raspberry pi and mounts it.
- [`headless`](./ansible_collections/emrys_merlin/rpi/roles/headless/): This role can be used to boot the raspberry pi in CLI mode (no X server or wayland started).
- [`web_watchr`](./ansible_collections/emrys_merlin/rpi/roles/web_watchr/): Rhis role launches a docker container that uses [WebWatchr](https://github.com/Emrys-Merlin/web_watchr) to monitor a website for changes.

### `emrys_merlin.uberspace`

- [`gitea`](./ansible_collections/emrys_merlin/uberspace/roles/gitea/): This role launches a [gitea](https://about.gitea.com/) service on uberspace.
- [`sr_optimal_edge`](./ansible_collections/emrys_merlin/uberspace/roles/sr_optimal_edge_bot/): This role launches a discord bot that can be used for (min-max) Shadowrun players how to optimize their edge usage. You can find out more in [this blog post](https://timjadler.de/blog-posts/shadowrun-optimal-edge)

## Usage

To install these collections, you can follow the [Installing a collection from a git repository](https://docs.ansible.com/ansible/latest/collections_guide/collections_installing.html#installing-a-collection-from-a-git-repository) manual. Afterward, the roles should be available for usage in your playbooks.

For my personal use, I use `git subtree` together with this repository to install the collection [adjacent to my playbooks](https://docs.ansible.com/ansible/latest/collections_guide/collections_installing.html#installing-collections-adjacent-to-playbooks).