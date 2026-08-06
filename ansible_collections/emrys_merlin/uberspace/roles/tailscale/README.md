# emrys_merlin.uberspace.tailscale

Runs `tailscaled` in **userspace networking** mode under the unprivileged
uberspace account, supervised by supervisord.

Background and the decisions behind this role live in
`plans/18-tailscale-uberspace.md`. The short version of the awkward parts:

- **Kernel TUN is not available.** `/dev/net/tun` exists on the host and is
  world-readable/writable, which is misleading — creating an interface still
  needs `CAP_NET_ADMIN`. Do not "optimise" this role back to normal TUN mode.
- **`~/etc/services.d/`, not `~/etc/supervisor.d/`.** `/etc/supervisord.conf`
  includes `%(ENV_HOME)s/etc/services.d/*.ini` and nothing else.
- **`~` is not expanded inside a program's arguments.** The `.ini` template uses
  `%(ENV_HOME)s` throughout. Getting this wrong leaves a directory literally
  named `~` on the host; there is one already, from the prometheus role.
- **The play sets `gather_facts: false`,** so `ansible_env.HOME` does not exist.
  Module paths use `~`, shell commands use `$HOME`.

## Outbound access

In userspace mode there is no network interface, so processes on the box have no
route to `100.64.0.0/10`. The **only** ways out are the proxy listener and the
`tailscale` CLI. The daemon therefore runs with both `--socks5-server` and
`--outbound-http-proxy-listen` pointed at the same address
(`tailscale_proxy_listen`, default `localhost:1055`) — tailscaled multiplexes
SOCKS5 and HTTP CONNECT on one listener.

Consumers should prefer **`socks5h`** over `socks5`, so hostnames are resolved by
tailscaled (MagicDNS) instead of locally.

## `~/bin/tailscale` is a wrapper, not a symlink

The CLI takes its socket path only as `--socket`; there is no `TS_SOCKET`
environment variable. Callers that spawn a bare `tailscale` — notably Uptime
Kuma's built-in *Tailscale Ping* monitor — would otherwise fail against the
root-owned default socket. `~/bin/tailscale` is a small `exec` wrapper that
injects `--socket`; the real binary is `~/bin/tailscale-cli`.

## Relay vs. direct

Outbound STUN (UDP 3478) gets no reply from uberspace, so by default peers reach
this node over **DERP relays on TCP 443**. Functional, but with extra latency and
relayed throughput.

Setting `tailscale_port` to a port from `uberspace port add` makes tailscaled bind
a fixed UDP port, which *may* yield a direct path since uberspace hosts have a
public IP and no NAT. Check with `tailscale status` — it prints `direct` or
`relay` per peer. Leave the variable empty to skip `--port` entirely.

**Do not set it to 40740** — that port is in use for mosh.

## Variables

| Variable | Default | Purpose |
|---|---|---|
| `tailscale_version` | `1.102.2` | Pinned release; a bump re-downloads and relinks |
| `tailscale_hostname` | `{{ ansible_user }}-uberspace` | Name in the tailnet |
| `tailscale_port` | `""` | Fixed UDP port from `uberspace port add`; empty = relay-only |
| `tailscale_proxy_listen` | `localhost:1055` | SOCKS5 + HTTP CONNECT listener |
| `tailscale_authkey` | — | **Required.** From `group_vars/uberspace/secrets.yml` |

## Idempotency

The install is skipped when `~/bin/tailscaled-<version>` already exists, and
`tailscale up` runs only when `tailscale status --json` reports a
`BackendState` other than `Running` — `up` is not safe to re-run
unconditionally. The role ends with an assert on the backend state, so a
rejected or expired auth key fails the play rather than passing quietly.

## Key expiry

Auth keys expire (90 days maximum) and so do node keys. After the first
successful `up`, disable key expiry for this node in the admin console, or it
will silently drop off the tailnet in roughly six months.
