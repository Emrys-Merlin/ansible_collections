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

Monitoring with Uptime Kuma
---------------------------

Both the cron job and the mount can report to [Uptime Kuma](https://uptime.kuma.pet)
Push monitors. Everything is off by default, so an invocation that sets none of
these behaves exactly as before.

| Variable | Default | Purpose |
|---|---|---|
| `rclone_push_url` | `""` | Full push URL (base + token) for the cron job. Empty skips pushing |
| `rclone_job_timeout` | `21600` | Seconds before the job is killed and reported hung |
| `rclone_mount_probe_enable` | `false` | Install a cron probe that actively touches the mount |
| `rclone_mount_probe_path` | `{{ rclone_location }}/data` | **Host-side** mountpoint |
| `rclone_mount_probe_push_url` | `""` | Full push URL for the probe |
| `rclone_mount_probe_minute` | `*/10` | Probe schedule |
| `rclone_mount_probe_timeout` | `30` | Seconds before the mount is called hung |

Two things worth knowing before changing any of this:

- The job runs `docker compose up **--exit-code-from rclone**`. Plain
  `docker compose up` — what this role used to run — exits **0 even when the
  container fails**, so any success/failure reporting built on it would be green
  precisely when it should be red.
- `rclone_mount_probe_path` is **not derivable** from `rclone_command`: that
  carries the path *inside* the container, and only `/data` is bind-mounted.
  A mount whose command ends in `/data/pcloud` needs
  `rclone_mount_probe_path: "{{ rclone_location }}/data/pcloud"` spelled out.

The probe exists because a mount that is *gone* and a mount that is *hung* look
different: the first makes node_exporter's `node_filesystem_device_error` series
disappear, while the second still looks perfectly mounted and only reveals itself
when something tries to read it.

Requirements
------------

This role assumes that docker is installed on the host, and `curl` on it if push
monitoring is enabled.

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
