emrys_merlin.uberspace.prometheus
=================================

> **Not wired into any playbook. The service it installs no longer exists.**
>
> Prometheus was uninstalled from uberspace on 2026-08-10 together with Grafana,
> `promprox`, `homematicip_tracker` and `website_monitor` — service stopped,
> `/prometheus` web backend deleted, binaries, `~/etc/prometheus` and 225M of
> TSDB removed. The role is kept so a rebuild starts from working code, but note
> that `templates/prometheus.yml.j2` still lists scrape targets that are all
> gone now (`localhost:9135`, `localhost:8000`, `localhost:9129`, and `emu:9100`
> through the retired pushprox proxy). Anything reinstating this has to rewrite
> that file first. See `plans/32-grafana-uberspace-into-ansible.md`.
>
> `prometheus_version` was also a live trap while the role was wired in: the
> playbook said 2.45.0 while the host ran 2.17.2, so any untagged run would have
> flipped it as a side effect (`plans/21-prometheus-version-upgrade.md`). That is
> moot now, and plan 21 is closed as such.

The boilerplate below is unedited from `ansible-galaxy init`.

Role Name
=========

A brief description of the role goes here.

Requirements
------------

Any pre-requisites that may not be covered by Ansible itself or the role should be mentioned here. For instance, if the role uses the EC2 module, it may be a good idea to mention in this section that the boto package is required.

Role Variables
--------------

A description of the settable variables for this role should go here, including any variables that are in defaults/main.yml, vars/main.yml, and any variables that can/should be set via parameters to the role. Any variables that are read from other roles and/or the global scope (ie. hostvars, group vars, etc.) should be mentioned here as well.

Dependencies
------------

A list of other roles hosted on Galaxy should go here, plus any details in regards to parameters that may need to be set for other roles, or variables that are used from other roles.

Example Playbook
----------------

Including an example of how to use your role (for instance, with variables passed in as parameters) is always nice for users too:

    - hosts: servers
      roles:
         - { role: username.rolename, x: 42 }

License
-------

BSD

Author Information
------------------

An optional section for the role authors to include contact information, or a website (HTML is not allowed).
