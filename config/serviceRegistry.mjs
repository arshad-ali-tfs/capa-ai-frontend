/**
 * Registry of the CAPA.AI backend services.
 *
 * This is the only place that names the services. The Vite dev proxy, the
 * production server (server.mjs) and the browser API clients all read it.
 * To add a service, add one entry below.
 *
 *   label          Display name used in messages.
 *   defaultTarget  Where the service listens locally.
 *   targetEnv      Server-side URL, or app-resource name inside Databricks Apps.
 *   tokenEnv       Server-side variable holding an optional bearer token.
 *   browserUrlEnv  Optional build-time variable. When set, the browser calls
 *                  the service directly instead of through the frontend
 *                  server (the service must then allow the origin with CORS).
 *   routes         Paths the frontend server forwards to the service. A route
 *                  ending in "/" matches that prefix; any other route must
 *                  match exactly.
 */
export const SERVICES = Object.freeze({
  map: Object.freeze({
    label: "MAP",
    defaultTarget: "http://127.0.0.1:8101",
    targetEnv: "MAP_API_TARGET",
    tokenEnv: "MAP_API_BEARER_TOKEN",
    browserUrlEnv: "VITE_MAP_API_URL",
    routes: Object.freeze(["/map/dataset", "/api/v1/map/"]),
  }),
  match: Object.freeze({
    label: "MATCH",
    defaultTarget: "http://127.0.0.1:8102",
    targetEnv: "MATCH_API_TARGET",
    tokenEnv: "MATCH_API_BEARER_TOKEN",
    browserUrlEnv: "VITE_MATCH_API_URL",
    routes: Object.freeze(["/api/v1/match/"]),
  }),
  author: Object.freeze({
    label: "AUTHOR",
    defaultTarget: "http://127.0.0.1:8103",
    targetEnv: "AUTHOR_API_TARGET",
    tokenEnv: "AUTHOR_API_BEARER_TOKEN",
    browserUrlEnv: "VITE_AUTHOR_API_URL",
    routes: Object.freeze(["/api/v1/author/"]),
  }),
})
