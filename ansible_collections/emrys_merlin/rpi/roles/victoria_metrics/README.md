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
- `victoria_metrics_ha_keep_last_updated_entities` — `entity` regexes for which
  `homeassistant_last_updated_time_seconds` is also kept (empty disables it).

## Home Assistant scrape

Set `victoria_metrics_scrape_homeassistant: true` and provide
`victoria_metrics_ha_token` once HA's `prometheus:` integration is enabled and a
long-lived access token exists. The role templates a promscrape config that
scrapes `/api/prometheus` and applies a `keep` relabel so only
`victoria_metrics_ha_keep_metrics` are stored. Victoria Metrics reloads the scrape
config on change (checked every 30s), so extending the keep-list only needs a
re-run, not a restart.

### Picking metric names

HA derives the metric name from the entity's **`device_class`**, not from its
name — so a sensor called `..._humidity` is not necessarily
`homeassistant_sensor_humidity_percent`. Two that look alike but are not:

| device_class | metric | means |
|---|---|---|
| `humidity` | `homeassistant_sensor_humidity_percent` | **air** humidity |
| `moisture` | `homeassistant_sensor_moisture_percent` | **soil** moisture |

Check against the live endpoint before adding a name — a keep-entry that matches
nothing fails silently, storing zero series:

```
curl -sH "Authorization: Bearer $HA_TOKEN" http://homeassistant.local:8123/api/prometheus \
  | grep -v '^#' | grep -i <entity-substring>
```

### Staleness: never derive it from sample age

`time() - timestamp(last_over_time(m[7d]))` measures **scrape** freshness and is
useless as a liveness signal. HA re-exports an entity's retained state on every
scrape, so a device that stopped reporting days ago still produces a fresh sample
every scrape interval, forever. Soil-moisture probes were silent for 4.5 days while
that expression reported ~30s for all of them.

Use **`homeassistant_last_updated_time_seconds`** instead — HA's own `last_updated`
timestamp per entity, and the only device-side signal on `/api/prometheus`. Enable
it per entity via `victoria_metrics_ha_keep_last_updated_entities`; it covers ~1300
entities instance-wide, hence the filter. Age is then `time() - <that metric>`.

Two caveats:

- It moves on a **value or attribute change**, not on every report, so a genuinely
  constant sensor also ages. Compare two channels on the same device (e.g. moisture
  vs temperature) to tell "unchanged" from "silent".
- `homeassistant_entity_available` does **not** cover this failure: an entity with a
  stale retained state is still `available`. It only catches the `unavailable`/
  `unknown` states.

Because the entity regexes contain `\.`, the combined keep rule is emitted with
`| to_json`. Hand-quoting it produces a YAML unknown-escape error, on which
VictoriaMetrics logs a parse failure and **silently continues with the previous
config** — the scrape keeps working and nothing looks wrong.

### Label enrichment covers `sensor` only

`victoria_metrics_ha_label_template` iterates `states.sensor`, so kept metrics
from other domains (e.g. `homeassistant_number_state_percent`) arrive **without**
`location`/`integration`. Select those by `entity` regex.
