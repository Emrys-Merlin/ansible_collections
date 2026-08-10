# emrys_merlin.uberspace.grafana

> **Not wired into any playbook. The service it describes no longer exists.**
>
> The uberspace Grafana was uninstalled on 2026-08-10 — service stopped, the
> `/grafana` web backend deleted, ~830M of files and the `timadler_grafana`
> database removed. This role was written the day before, to adopt the running
> instance; it is kept because a working, host-accurate role is worth more than
> a blank page if the decision is ever revisited, and because everything below
> is the only remaining description of how that install was actually put
> together. Nothing here has been rewritten to the past tense, so read it as a
> record of a host that is gone.
>
> Rebuilding from it is **not** a matter of adding the role back to
> `uberspace.yml`. The install block would run for the first time ever (see
> "unexercised" below), the database would have to be recreated and restored
> from `~/backups/uberspace-2026-08-10/grafana-db.sql`, and the four credentials
> in `grafana.ini` no longer exist anywhere but that backup. See
> `plans/32-grafana-uberspace-into-ansible.md`.

Runs [Grafana](https://grafana.com) under the unprivileged uberspace account,
supervised by supervisord, backed by the account's MariaDB, and published on the
public internet at `https://timadler.uber.space/grafana/`.

Background and the decisions behind this role live in
`plans/32-grafana-uberspace-into-ansible.md`.

## There are two Grafanas, and this is not the other one

| | This role | `roles/grafana_dashboards` |
|---|---|---|
| Instance | uberspace, `~/usr/share/grafana` | an LXC on proxmox |
| Version | 9.0.6 (pinned; see below) | 13.1.0 |
| Datasource | Prometheus on uberspace | VictoriaMetrics on `emu` |
| Reach | public, `/grafana` | LAN/tailnet only |
| Playbook | none since 2026-08-10 (was `ansible/uberspace.yml`, tag `grafana`) | `ansible/grafana.yml`, tag `grafana_dashboards` |
| What is managed | the *service* — install, config, supervisord unit, web backend | the *dashboards*, over the HTTP API |

The case for keeping both was that the alerting on the uberspace instance was
off-site, so a power or network failure at home could not take the alerter down
along with the things it was watching. That argument lost to the plainer one:
the dashboards had not been looked at in years, and unwatched alerting on an
out-of-support 2022 build is upkeep rather than safety. The LXC Grafana is now
the only one, and it keeps the bare `grafana_edit_token` in 1Password; no
`grafana_uberspace_*` items were ever created.

## The version is pinned low on purpose

9.0.6 dates from August 2022 and is long out of support. Upgrading is **not** a
drive-by: there is a schema migration in `timadler_grafana` behind it, plus
plugin compatibility and dashboard rendering changes. It has its own phase in
plan 32.

Treat `grafana_version` the way `prometheus_version` should have been treated —
the playbook there claims 2.45.0 while the host runs 2.17.2, so any untagged run
flips it as a side effect. This role guards against the same trap from the other
direction: it asserts that `/api/health` reports exactly `grafana_version`, so a
hand-upgrade on the host fails the run loudly instead of being silently reverted.

## What this role does and does not own

It owns the install (both binaries plus `conf/` and `public/` in the homepath),
the supervisord unit, the `uberspace web backend`, and the **non-secret** options
in `~/etc/grafana/grafana.ini`.

It does **not** own:

- **The four credentials in `grafana.ini`** — `[database] user`/`password`,
  `[security] admin_user`/`admin_password`, `[smtp] user`/`password`. They are
  still the hand-typed values. Phase B of plan 32 moves them into 1Password and
  rotates them. Until then `ini_file` leaves them alone, which is the only reason
  adopting this service was a no-op.
- **Dashboards, datasources, alert rules and contact points.** All live in the
  database and are configured in the UI. Grafana 9 can do file-based
  provisioning; whether to use it is an open question in the plan, not something
  this role has decided.
- **`data/` inside the homepath**, which is runtime state (`png/`, `csv/`,
  `alerting/`). An upgrade overwrites `conf/` and `public/` and leaves `data/`.

`grafana.ini` is edited option-by-option with `ini_file` rather than templated
wholesale, for the same reason the gitea role stopped templating `app.ini`: the
role does not own the whole file. A template task would silently take the four
credentials with it.

## The config file is 0664 and that is (for now) fine

Four passwords in a group- and world-readable file looks alarming until you check
that `/home/timadler` is `0700`, so nothing else on this shared host can traverse
to it. The role deliberately passes no `mode`, which leaves the existing one
alone. Tightening to `0600` belongs in phase B, when the file is being rewritten
with rotated values anyway.

## Two files are called `grafana.ini`

- `~/etc/grafana/grafana.ini` — the Grafana config, managed by `ini_file`.
- `~/etc/services.d/grafana.ini` — the supervisord unit, rendered from
  `templates/grafana-service.ini.j2`.

The template is named `grafana-service.ini.j2` precisely so the two cannot be
mixed up in the role source. Only `~/etc/services.d/*.ini` is read by supervisord
on this host — see `plans/20-fix-prometheus-supervisord-path.md`, which fixed
exactly that bug in another role. Do not reintroduce it.

## The install path is version-guarded, and unexercised

`grafana-server -v` is read off the host and compared with `grafana_version`;
the download-and-unpack block runs only when they differ or the binary is
missing. That is why adopting the running service changed nothing.

The flip side is that **the install block has never run against this host** — the
version has matched from the first run. It was exercised against a scratch prefix
(see the plan) but not against a real upgrade. Phase C is where it gets its first
real test, and that is the moment to watch it rather than fire and forget.

Version is read from the binary rather than tracked in a marker file — the
uptime_kuma role's approach — because there was no marker on this host and
creating one would itself have been a change.

## Variables

| Variable | Default | Notes |
|---|---|---|
| `grafana_version` | `9.0.6` | Asserted against `/api/health`; see above before bumping |
| `grafana_archive_sha256` | pinned | Verified by `get_url`; must change with the version |
| `grafana_homepath` | `~/usr/share/grafana` | Holds `conf/`, `public/`, `data/` — the tarball minus `bin/` |
| `grafana_bin_dir` | `~/bin` | Where the hand-install put the binaries |
| `grafana_plugins_dir` | `/home/<user>/var/lib/grafana/plugins` | Absolute; outside the homepath so it survives upgrades |
| `grafana_port` | `3000` | 3001 is gitea, 3002 is uptime kuma |
| `grafana_web_backend_path` | `/grafana` | Public. Needs `serve_from_sub_path` |
| `grafana_root_url` | `%(protocol)s://%(domain)s/grafana/` | Grafana's own interpolation, not Jinja's |
| `grafana_db_name` | `<user>_grafana` | Uberspace only grants privileges on `<user>\_%` |
| `grafana_smtp_enabled` | `"True"` | Capital T deliberately, to match what is on disk |

## `--check` safety

`Read the installed grafana version` and `Check for the public web backend` carry
`check_mode: false`. **Do not remove it.** A command skipped by `--check` returns
an *empty* `stdout`, not an undefined one, so the failure is quiet rather than
loud: the version check would report the installed version as not matching and a
dry run would announce a full reinstall of a host that needs nothing.

## Housekeeping this role does not do

`~/usr/share/grafana/conf.bak` and `public.bak` are leftovers from the 2020
install — about 77M of dead weight. They are not touched here; removing them is a
separate, deliberate decision.
