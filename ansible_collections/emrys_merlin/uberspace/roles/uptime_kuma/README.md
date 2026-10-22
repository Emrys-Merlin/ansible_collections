# emrys_merlin.uberspace.uptime_kuma

Runs [Uptime Kuma](https://github.com/louislam/uptime-kuma) under the
unprivileged uberspace account, supervised by supervisord, backed by the
account's MariaDB, and reachable **only over the tailnet**.

Background and the decisions behind this role live in
`plans/19-uptime-kuma-uberspace.md`.

## It is not reachable from the internet, on purpose

The server binds `127.0.0.1` and there is **no `uberspace web backend`**. It is
reached at `http://<tailscale-hostname>:3002/` from any tailnet device, because
userspace `tailscaled` forwards inbound tailnet connections to localhost — this
was measured on the host, not assumed.

Two consequences worth keeping in mind before "fixing" the bind address:

- The admin login is not on the public internet. Putting it there is a real
  decision, not a convenience tweak.
- The socket.io/WebSocket connection runs over a plain forwarded TCP connection,
  so none of the usual reverse-proxy WebSocket configuration applies. Adding a
  path-prefixed web backend would reintroduce exactly that problem.

## Node is pinned by absolute path

Uptime Kuma 2.x declares `engines.node: ">= 20.4.0"` and the account's active
version is 18. `uptime_kuma_node_bin` points straight at `/opt/nodejs22/bin`
rather than the role running `uberspace tools version use node 22`, which would
change the Node version **account-wide** for every service on the box.

The one native dependency, `@louislam/sqlite3`, is a hard dependency even when
using MariaDB. Its prebuilt binary needs only `GLIBC_2.14`, so it loads on this
host's glibc 2.17 — which is fortunate, because nothing here could build it:
gcc is 4.8.5 (C++11 only) and Python is 3.6.8.

That is also why `npm ci` is retried. If the prebuild download drops,
node-pre-gyp does not fail — it falls back to compiling from source, spends two
minutes discovering gcc 4.8.5 has no `-std=gnu++17`, and then fails the run. A
one-second network blip therefore looks like a broken role. The task retries,
and a `require()` check afterwards confirms the binding actually loads, since
`npm ci` exiting 0 does not prove that.

## Database

MariaDB, in `<user>_uptimekuma`. The uberspace account has exactly one MySQL
user, so `uptime_kuma_db_password` is the same secret the gitea role uses; it is
stored in 1Password once, as `gitea_db_password`.

The database tasks shell out to `/usr/bin/mysql` rather than using
`community.mysql`, which needs PyMySQL importable from whichever interpreter
Ansible discovers — on this host that is `python3.14`, and only `python3.6` has
it. Uberspace preconfigures `~/.my.cnf` (0600) with the account's credentials,
so those two tasks pass no secret at all. Do not "modernise" them back to the
collection; it fails here, and it takes the gitea role with it
(see `plans/22-mysql-collection-deprecation.md`).

The role writes `db-config.json` (0600) into the data directory itself. Uptime
Kuma also accepts `UPTIME_KUMA_DB_*` environment variables and will write that
file for you, but the credentials would then have to live in the supervisord
`.ini` — and supervisord treats `%` as an expansion character, so a password
containing one would silently break the unit. Writing the file directly avoids
that and keeps the password out of the process environment.

## The admin user is created by the role

There is no API for this — the UI does it over socket.io. `files/create-admin.js`
reproduces exactly what the `setup` socket handler does (bcryptjs, 10 rounds,
one row in `user`), using modules Uptime Kuma has already installed. It is a
no-op when a user already exists.

The ordering is fiddly and the tasks depend on it:

1. The `user` table is created by knex migrations on **first boot**, so the
   service must be started before the script can run.
2. A listening socket is not readiness — during migrations Uptime Kuma serves a
   holding page from a temporary server on the same port. The role waits for the
   `user` **table**, not the port.
3. `needSetup` is computed **once at startup**, so the service must be restarted
   *after* the user is inserted or it keeps serving the setup page.

## Variables

| Variable | Default | Notes |
|---|---|---|
| `uptime_kuma_version` | `2.5.6` | A bump is a var change; the install is versioned and guarded by a marker file |
| `uptime_kuma_node_bin` | `/opt/nodejs22/bin` | Must be Node >= 20.4.0; asserted |
| `uptime_kuma_host` | `127.0.0.1` | See above before changing |
| `uptime_kuma_port` | `3002` | 3001 is gitea, 3000 is grafana |
| `uptime_kuma_data_dir` | `~/var/lib/uptime-kuma` | Survives version bumps |
| `uptime_kuma_db_name` | `<user>_uptimekuma` | Uberspace only grants privileges on `<user>\_%` |
| `uptime_kuma_db_password` | — | Required; the account's MySQL password |
| `uptime_kuma_admin_user` | — | Required |
| `uptime_kuma_admin_password` | — | Required |

## After the first deploy

Configure in the UI, once:

- **A proxy**, type **SOCKS v5 (+DNS)** (`socks5h`) at `localhost:1055`, set as
  the default for new monitors. Without it nothing can reach the tailnet: in
  userspace mode there is no route to `100.64.0.0/10` and the proxy is the only
  way out.
- Only **HTTP(s)** and **Tailscale Ping** monitors work against tailnet targets.
  TCP Port, Ping (ICMP) and DNS monitors have no proxy support — they will fail
  against homelab hosts no matter how they are configured.

Monitors themselves are configured by hand and are **not** managed by Ansible;
Uptime Kuma 2.x has no REST API for creating them. That is a known trade,
recorded in the plan rather than discovered later.

## `--check` safety

The three read-only probes (the database existence check, the schema wait and
`Check uptime kuma is serving`) carry `check_mode: false`. **Do not remove it.**
A command skipped by `--check` returns an *empty* `stdout`, not an undefined one,
so the failure is quiet rather than loud: the database check reports an existing
database as missing, and the schema wait's `until` can never match `""`, so it
spends all 30 retries — five minutes — before failing what should be a fast dry
run.

`Create the uptime kuma admin user` deliberately does **not** have it, because it
writes; the assert that reads its `rc` is guarded with
`when: uptime_kuma_admin is not skipped` instead.
