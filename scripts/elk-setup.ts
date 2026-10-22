// Prepares Elasticsearch and Kibana for the app's logs: `npm run elk:setup`
// (after `docker compose --profile elk up -d`). Idempotent: run it again any time.
//   - index template spidersense-* (field types)
//   - data view "Spider Sense"
//   - Lens visualizations and the "Spider Sense — Monitoring" dashboard

import { setTimeout as sleep } from "node:timers/promises";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the environment.
}

const ES = process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
const KIBANA = process.env.KIBANA_URL ?? "http://localhost:5601";
const DATA_VIEW = "spidersense";
const DASHBOARD = "spidersense-monitoring";

async function call(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", "kbn-xsrf": "true", ...init.headers },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${url} → ${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function waitFor(name: string, url: string, ready: (body: unknown) => boolean) {
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      if (ready(await call(url))) return console.log(`✓ ${name} prêt`);
    } catch {
      // Not up yet.
    }
    await sleep(2000);
  }
  throw new Error(`${name} ne répond pas (${url}). Lancé avec docker compose --profile elk up -d ?`);
}

// --- Index template ----------------------------------------------------------------------

const TEMPLATE = {
  index_patterns: ["spidersense-*"],
  priority: 200,
  template: {
    settings: { number_of_replicas: 0 },
    mappings: {
      // Strings are identifiers (route, event type, user id…): keyword, aggregatable.
      dynamic_templates: [{ strings: { match_mapping_type: "string", mapping: { type: "keyword", ignore_above: 1024 } } }],
      properties: {
        "@timestamp": { type: "date" },
        message: { type: "text" },
        duration_ms: { type: "float" },
        sync_lag_ms: { type: "long" },
        offline_replay: { type: "boolean" },
        idempotent_replay: { type: "boolean" },
        event: {
          properties: {
            duration: { type: "long" },
            sequence: { type: "long" },
            created: { type: "date" },
            ingested: { type: "date" },
          },
        },
        http: { properties: { response: { properties: { status_code: { type: "long" } } } } },
        error: { properties: { stack_trace: { type: "text" } } },
      },
    },
  },
};

// --- Lens visualizations -------------------------------------------------------------------

type Column = Record<string, unknown>;

const columns = {
  time: { label: "@timestamp", dataType: "date", operationType: "date_histogram", sourceField: "@timestamp", isBucketed: true, scale: "interval", params: { interval: "auto", includeEmptyRows: true, dropPartials: false } },
  count: (label: string) => ({ label, customLabel: true, dataType: "number", operationType: "count", sourceField: "___records___", isBucketed: false, scale: "ratio", params: { emptyAsNull: false } }),
  percentile: (field: string, percentile: number, label: string) => ({ label, customLabel: true, dataType: "number", operationType: "percentile", sourceField: field, isBucketed: false, scale: "ratio", params: { percentile } }),
  median: (field: string, label: string) => ({ label, customLabel: true, dataType: "number", operationType: "median", sourceField: field, isBucketed: false, scale: "ratio", params: {} }),
  average: (field: string, label: string) => ({ label, customLabel: true, dataType: "number", operationType: "average", sourceField: field, isBucketed: false, scale: "ratio", params: {} }),
  terms: (field: string, label: string, orderBy: string, size = 10) => ({
    label,
    customLabel: true,
    dataType: "string",
    operationType: "terms",
    sourceField: field,
    isBucketed: true,
    scale: "ordinal",
    params: { size, orderBy: { type: "column", columnId: orderBy }, orderDirection: "desc", otherBucket: true, missingBucket: false, parentFormat: { id: "terms" } },
  }),
};

function lens(
  id: string,
  title: string,
  visualizationType: string,
  kql: string,
  layer: Record<string, Column>,
  visualization: Record<string, unknown>,
) {
  return {
    type: "lens",
    id,
    attributes: {
      title,
      description: "",
      visualizationType,
      state: {
        datasourceStates: {
          formBased: {
            layers: {
              // Lens wants the bucket columns (time, terms) before the metrics.
              layer1: {
                columns: layer,
                columnOrder: Object.keys(layer).sort((a, b) => Number(Boolean(layer[b].isBucketed)) - Number(Boolean(layer[a].isBucketed))),
                incompleteColumns: {},
                sampling: 1,
              },
            },
          },
        },
        visualization,
        query: { query: kql, language: "kuery" },
        filters: [],
        internalReferences: [],
        adHocDataViews: {},
      },
    },
    references: [{ type: "index-pattern", id: DATA_VIEW, name: "indexpattern-datasource-layer-layer1" }],
  };
}

const xy = (seriesType: string, x: string, accessors: string[], split?: string) => ({
  legend: { isVisible: true, position: "bottom" },
  valueLabels: "hide",
  fittingFunction: "Linear",
  preferredSeriesType: seriesType,
  layers: [{ layerId: "layer1", layerType: "data", seriesType, xAccessor: x, accessors, ...(split ? { splitAccessor: split } : {}) }],
});

const metric = (accessor: string) => ({ layerId: "layer1", layerType: "data", metricAccessor: accessor });

const REQUESTS = 'event.dataset : "api.request"';
const EVENTS = 'event.dataset : "domain.event"';

const VISUALIZATIONS = [
  lens("ss-p95", "Temps de réponse API — p95 (ms)", "lnsMetric", REQUESTS, { p95: columns.percentile("duration_ms", 95, "p95 (ms)") }, metric("p95")),
  lens("ss-requests", "Requêtes API", "lnsMetric", REQUESTS, { count: columns.count("Requêtes") }, metric("count")),
  lens("ss-events", "Événements du journal", "lnsMetric", EVENTS, { count: columns.count("Événements") }, metric("count")),
  lens(
    "ss-sync-lag",
    "Délai moyen de synchronisation hors ligne (ms)",
    "lnsMetric",
    `${EVENTS} and source : "offline"`,
    { lag: columns.average("sync_lag_ms", "Délai moyen (ms)") },
    metric("lag"),
  ),
  lens(
    "ss-latency",
    "Temps de réponse API dans le temps",
    "lnsXY",
    REQUESTS,
    { time: columns.time, p50: columns.median("duration_ms", "Médiane (ms)"), p95: columns.percentile("duration_ms", 95, "p95 (ms)") },
    xy("line", "time", ["p50", "p95"]),
  ),
  lens(
    "ss-slow-routes",
    "Routes les plus lentes (p95, ms)",
    "lnsXY",
    REQUESTS,
    { route: columns.terms("url.path", "Route", "p95"), p95: columns.percentile("duration_ms", 95, "p95 (ms)") },
    xy("bar_horizontal", "route", ["p95"]),
  ),
  lens(
    "ss-event-types",
    "Événements du journal par type",
    "lnsXY",
    EVENTS,
    { time: columns.time, count: columns.count("Événements"), action: columns.terms("event.action", "Type", "count") },
    xy("bar_stacked", "time", ["count"], "action"),
  ),
  lens(
    "ss-event-source",
    "Origine des événements",
    "lnsPie",
    EVENTS,
    { source: columns.terms("source", "Origine", "count", 5), count: columns.count("Événements") },
    {
      shape: "donut",
      layers: [
        { layerId: "layer1", layerType: "data", primaryGroups: ["source"], metrics: ["count"], numberDisplay: "percent", categoryDisplay: "default", legendDisplay: "default", nestedLegend: false },
      ],
    },
  ),
  lens(
    "ss-status",
    "Codes de réponse HTTP",
    "lnsXY",
    REQUESTS,
    { time: columns.time, count: columns.count("Requêtes"), status: columns.terms("http.response.status_code", "Code", "count", 8) },
    xy("bar_stacked", "time", ["count"], "status"),
  ),
  lens(
    "ss-errors",
    "Erreurs serveur",
    "lnsDatatable",
    'event.dataset : "app.error" or http.response.status_code >= 500',
    { route: columns.terms("url.path", "Route", "count", 20), count: columns.count("Erreurs") },
    { layerId: "layer1", layerType: "data", columns: [{ columnId: "route" }, { columnId: "count" }] },
  ),
];

// Grid of 48 columns: [visualization id, x, y, width, height].
const LAYOUT: [string, number, number, number, number][] = [
  ["ss-p95", 0, 0, 12, 8],
  ["ss-requests", 12, 0, 12, 8],
  ["ss-events", 24, 0, 12, 8],
  ["ss-sync-lag", 36, 0, 12, 8],
  ["ss-latency", 0, 8, 28, 14],
  ["ss-slow-routes", 28, 8, 20, 14],
  ["ss-event-types", 0, 22, 28, 14],
  ["ss-event-source", 28, 22, 20, 14],
  ["ss-status", 0, 36, 28, 12],
  ["ss-errors", 28, 36, 20, 12],
];

function dashboard() {
  const panels = LAYOUT.map(([, x, y, w, h], index) => ({
    type: "lens",
    panelIndex: `p${index}`,
    gridData: { x, y, w, h, i: `p${index}` },
    embeddableConfig: {},
    panelRefName: `panel_p${index}`,
  }));
  return {
    type: "dashboard",
    id: DASHBOARD,
    attributes: {
      title: "Spider Sense — Monitoring",
      description: "Temps de réponse de l'API, journal d'événements, synchronisation hors ligne, erreurs.",
      panelsJSON: JSON.stringify(panels),
      optionsJSON: JSON.stringify({ useMargins: true, syncColors: false, syncCursor: true, syncTooltips: false, hidePanelTitles: false }),
      timeRestore: true,
      timeFrom: "now-1h",
      timeTo: "now",
      refreshInterval: { pause: false, value: 10_000 },
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: "", language: "kuery" }, filter: [] }) },
    },
    references: LAYOUT.map(([id], index) => ({ name: `p${index}:panel_p${index}`, type: "lens", id })),
  };
}

async function main() {
  await waitFor("Elasticsearch", `${ES}/_cluster/health`, (body) => ["green", "yellow"].includes((body as { status: string }).status));
  await call(`${ES}/_index_template/spidersense`, { method: "PUT", body: JSON.stringify(TEMPLATE) });
  console.log("✓ modèle d'index spidersense-*");

  await waitFor("Kibana", `${KIBANA}/api/status`, (body) => (body as { status: { overall: { level: string } } }).status.overall.level === "available");
  await call(`${KIBANA}/api/data_views/data_view`, {
    method: "POST",
    body: JSON.stringify({
      override: true,
      data_view: { id: DATA_VIEW, title: "spidersense-*", name: "Spider Sense", timeFieldName: "@timestamp" },
    }),
  });
  console.log("✓ vue de données « Spider Sense »");

  const result = (await call(`${KIBANA}/api/saved_objects/_bulk_create?overwrite=true`, {
    method: "POST",
    body: JSON.stringify([...VISUALIZATIONS, dashboard()]),
  })) as { saved_objects: { id: string; error?: { message: string } }[] };
  const failed = result.saved_objects.filter((object) => object.error);
  if (failed.length) throw new Error(failed.map((object) => `${object.id}: ${object.error!.message}`).join("\n"));
  console.log(`✓ ${VISUALIZATIONS.length} visualisations et le tableau de bord`);
  console.log(`\nTableau de bord : ${KIBANA}/app/dashboards#/view/${DASHBOARD}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
