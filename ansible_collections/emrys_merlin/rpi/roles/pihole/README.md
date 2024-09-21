Pihole
=========

Launch a [pihole](https://pi-hole.net/) in a docker container.

Example Playbook
----------------

    - hosts: servers
      roles:
        - role: emrys_merlin.rpi.pihole
          pihole_project_dir: "{{ docker_dir }}/pihole"
          pihole_webpasswd: "Retrieve from vault"
