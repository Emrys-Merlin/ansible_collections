# victoria_metrics

Deploy a single-node [Victoria Metrics](https://victoriametrics.com/) instance as
a Docker container (via docker compose). Optionally scrapes a Home Assistant
`prometheus:` endpoint, keeping only a configurable subset of metrics.

Requires Docker on the host (see the `docker` role).

## Key variables

- `victoria_metrics_version` — pinned image tag (default `v1.147.0`).
- `victoria_metrics_location` — host dir for compose + data (`{{ docker_dir }}/victoria_metrics`).
- `victoria_metrics_port` — HTTP listen/publish port (default `8428`).
- `victoria_metrics_retention` — retention period (default `"100y"`, i.e. keep indefinitely).
- `victoria_metrics_scrape_homeassistant` — enable the HA scrape job (default `false`).
- `victoria_metrics_ha_scheme` / `_host` / `_port` — HA target (default `http://homeassistant.local:8123`).
- `victoria_metrics_ha_token` — HA long-lived access token (set from a secret store).
- `victoria_metrics_ha_keep_metrics` — list of metric names to keep; everything else is dropped.

## Home Assistant scrape

Set `victoria_metrics_scrape_homeassistant: true` and provide
`victoria_metrics_ha_token` once HA's `prometheus:` integration is enabled and a
long-lived access token exists. The role templates a promscrape config that
scrapes `/api/prometheus` and applies a `keep` relabel so only
`victoria_metrics_ha_keep_metrics` are stored. Victoria Metrics reloads the scrape
config on change (checked every 30s), so extending the keep-list only needs a
re-run, not a restart.
