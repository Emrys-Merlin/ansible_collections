Gitea
=====

Launch a [gitea](https://about.gitea.com) instance on uberspace.

Example Playbook
----------------

    - hosts: servers
      roles:
        - role: emrys_merlin.uberspace.gitea
          gitea_db_name: "{{ ansible_user }}_gitea"
          gitea_port: 3001
          gitea_root_url: "http://<node>.<tailnet>.ts.net:3001/"
          gitea_admin_user: "Retrieve from vault"
          gitea_admin_password: "Retrieve from vault"

Reachability
------------

Gitea binds **`127.0.0.1` only** (`gitea_host`) and is reached over the tailnet,
the same way `roles/uptime_kuma` is: userspace `tailscaled` forwards inbound
tailnet connections to localhost. The role actively **removes** the
`uberspace web backend` for `gitea_web_backend_path`, so a public route does not
come back by accident.

`gitea_root_url` has no default. It is what clone URLs, LFS endpoints and webhook
payloads are built from, so it must be the address a client actually uses — the
node's `ts.net` name, not `gitea_host`. A public-looking default here would put
the instance back on the internet on any host that forgot to set it, so the role
asserts instead of guessing.

Two things this does **not** cover, and should not be mistaken for coverage:

- **SSH clone stays reachable publicly.** It goes through uberspace's own `sshd`
  on port 22, which is not this account's to close, so
  `ssh://<user>@<host>.uber.space/...` keeps working. The UI does advertise the
  *tailnet* SSH URL — forgejo derives the SSH host from `ROOT_URL` when
  `SSH_DOMAIN` is unset, and both were measured to clone successfully — but
  advertising one address does not close the other.
- **Plain HTTP is not plaintext on the wire** — WireGuard encrypts it end to end.
  The cost is browser warnings and no padlock, not exposure.

Configuration (`app.ini`)
-------------------------

`app.ini` is edited key-by-key with `community.general.ini_file`. **Never replace
this with a template.** Gitea writes generated state back into the same file —
on this host `WORK_PATH`, `[server] LFS_JWT_SECRET`, `[security] INTERNAL_TOKEN`
and `[oauth2] JWT_SECRET` — and a template silently drops all of it, which breaks
LFS auth, gitea's internal API and every issued OAuth2 token. The role owns the
28 options listed in `tasks/main.yml` and deliberately leaves everything else
alone. The file is `0600`; it holds four secrets.

Several of those 28 are pinned specifically because upstream's default for them
**changed underneath a working deployment** — `[repository] ROOT` across the
gitea → forgejo fork, `[database] HOST` at v15, `[server] HTTP_ADDR` and
`[database] CHARSET_COLLATION` never having been set at all. Naming a value here
makes it this role's decision rather than the binary's. Do not "tidy up" a key by
deleting it because it matches the current default.

The consequence to be aware of: anything configured through the gitea UI that
lands in `app.ini` persists and is invisible to this repo. The role does not
own the whole file, only the keys it names.

Upgrades and handler order
--------------------------

Bumping `gitea_version` downloads the new binary, repoints the `~/bin/gitea`
symlink at it, and notifies **Stop → Migrate → Restart**. Handlers run in the
order they are *defined* in `handlers/main.yml`, not the order they are
notified, so that file's ordering is load-bearing — do not reorder it.

The stop matters: without it the role ran `gitea migrate` while the old server
was still up and connected to the database it was rewriting. `tasks/main.yml`
also flushes handlers before the reachability and admin-user probes, because by
that point the symlink already points at the new binary and those probes would
otherwise run it against an un-migrated database.

Database
--------

The database is created by driving `/usr/bin/mysql` through
`ansible.builtin.command`, **not** by `community.mysql.mysql_db`. **Do not
change it back.** That module needs PyMySQL importable from whichever
interpreter Ansible discovers on the target; uberspace has since shipped newer
Pythons, discovery moved to `/usr/bin/python3.14`, and only `/usr/bin/python3`
(3.6) has the library — so the module failed and took the whole `uberspace.yml`
run with it. The client needs no credentials, because uberspace preconfigures
`~/.my.cnf` (0600). `roles/uptime_kuma` does the same thing for the same reason.

The read-only `SHOW DATABASES LIKE` check carries `check_mode: false`; without
it a `--check` run skips the task and the `when` that reads its `stdout` fails.

`[database] CHARSET_COLLATION` is pinned to `utf8mb4_unicode_ci`. **Setting it
converts nothing** — it only decides what new tables get, so it stops the schema
splitting again. Repairing a schema that has already split is
`gitea doctor convert`, run by hand with the service stopped; that is not a task
here because it is a one-off and it rewrites every table.

The split is worth recognising: a mix of `utf8mb4_general_ci` and
`utf8mb4_unicode_ci` tables makes MariaDB reject joins across them with
`Error 1267 (HY000): Illegal mix of collations`, which surfaces as a **500 on
repository pages while the front page and the API stay healthy**. With this
option unset, gitea only warns about it at startup. See
`plans/22-forgejo-tailnet.md`, "The 500 on repository pages".
