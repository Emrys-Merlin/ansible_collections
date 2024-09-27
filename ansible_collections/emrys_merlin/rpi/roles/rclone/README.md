Rclone
======

Launch an rclone docker container that mounts a remote. Please note that this role requires a working `rclone.conf` that will be copied over to the host system. As this config contains secrets, it should never be added to version control.

Optionally, you can add the docker compose command to crontab to launch the rclone command regularly. This is useful, if the rclone command does not run continuously (e.g., for copy or move operations).

Requirements
------------

This role assumes that docker is installed on the host

Example Playbook
----------------


    - hosts: servers
      roles:
        - role: emrys_merlin.rpi.rclone
          rclone_location: "{{ docker_dir }}/rclone"
          rclone_uid: 1000
          rclone_gid: "{{ rclone_uid }}"
          rclone_config: rclone.conf
          rclone_command: copy gdrive:src pcloud:dest
          rclone_cron_enable: true
          rclone_cron_hour: 3
          rclone_cron_minute: 47
