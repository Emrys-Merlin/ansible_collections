Rclone
======

Launch an rclone docker container that mounts a remote. The role needs a working `rclone.conf`, which it writes to the host system. As this config contains secrets, it must never be added to version control.

Optionally, you can add the docker compose command to crontab to launch the rclone command regularly. This is useful, if the rclone command does not run continuously (e.g., for copy or move operations).

Supplying the config
--------------------

Two mutually exclusive ways, picked automatically:

- **`rclone_config_content` (preferred)** — the full text of `rclone.conf` as a
  variable, so no plaintext copy has to sit on the control node. Point it at a
  secret store, e.g.

      rclone_config_content: "{{ lookup('community.general.onepassword', 'rclone_conf', field='notesPlain', vault='ansible') }}"

  The task carries `no_log: true`, because a `--diff` run would otherwise print
  the OAuth tokens to the terminal.

- **`rclone_config` (legacy)** — filename of a plaintext config in the role's
  `files/` directory, used only when `rclone_config_content` is undefined.

Either way the file lands as `0600`, owned by `rclone_uid`/`rclone_gid`, which is
the uid the container runs as.

Note that rclone **writes refreshed OAuth tokens back** into `rclone.conf` on the
host, so the host copy drifts from the stored one. In practice only the
`access_token`/`expiry` change while the `refresh_token` stays put, so re-writing
the stored copy on the next deploy is harmless. If a remote does stop working,
recover with `rclone config reconnect <remote>:` and re-store the result.

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
          rclone_config_content: "{{ lookup('community.general.onepassword', 'rclone_conf', field='notesPlain', vault='ansible') }}"
          rclone_command: copy gdrive:src pcloud:dest
          rclone_cron_enable: true
          rclone_cron_hour: 3
          rclone_cron_minute: 47
