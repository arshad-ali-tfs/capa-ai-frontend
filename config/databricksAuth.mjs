import { httpUrl } from "./serverProxy.mjs"

/** Server-only app identity, with shared OAuth renewal and per-service targets. */
export function createServiceResolver(
  env = process.env,
  { fetchImpl = fetch, now = Date.now } = {},
) {
  let cachedToken = ""
  let refreshAt = 0
  let pendingToken = null
  const targets = new Map()
  const pendingTargets = new Map()

  function workspaceHost() {
    if (!env.DATABRICKS_HOST?.trim())
      throw new Error("DATABRICKS_HOST is unavailable.")
    return httpUrl(env.DATABRICKS_HOST, "DATABRICKS_HOST").origin
  }

  async function bearerToken(service) {
    // Explicit overrides belong only to their registered service.
    if (service.token) return service.token
    const clientId = env.DATABRICKS_CLIENT_ID?.trim()
    const clientSecret = env.DATABRICKS_CLIENT_SECRET?.trim()
    if (!env.DATABRICKS_HOST?.trim() || !clientId || !clientSecret) {
      if (env.DATABRICKS_APP_NAME || clientId || clientSecret)
        throw new Error("Databricks app OAuth credentials are unavailable.")
      return ""
    }
    if (cachedToken && now() < refreshAt) return cachedToken
    if (!pendingToken) {
      pendingToken = (async () => {
        const response = await fetchImpl(new URL("/oidc/v1/token", workspaceHost()), {
          method: "POST",
          headers: {
            authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
            "content-type": "application/x-www-form-urlencoded",
            accept: "application/json",
          },
          body: new URLSearchParams({ grant_type: "client_credentials", scope: "all-apis" }),
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        })
        if (!response.ok)
          throw new Error(`Databricks OAuth token request failed (${response.status}).`)
        const token = await response.json()
        if (
          typeof token.access_token !== "string" || !token.access_token.trim() ||
          !Number.isFinite(token.expires_in) || token.expires_in <= 0
        )
          throw new Error("Databricks OAuth returned an invalid token response.")
        cachedToken = token.access_token.trim()
        const lifetime = token.expires_in * 1000
        refreshAt = now() + lifetime - Math.min(60_000, lifetime / 10)
        return cachedToken
      })().finally(() => { pendingToken = null })
    }
    return pendingToken
  }

  async function appTarget(service, token) {
    if (service.target) return service.target
    if (targets.has(service.name)) return targets.get(service.name)
    if (!pendingTargets.has(service.name)) {
      const pending = (async () => {
        if (!token) throw new Error("Databricks app identity is unavailable.")
        const response = await fetchImpl(
          new URL(`/api/2.0/apps/${encodeURIComponent(service.appName)}`, workspaceHost()),
          {
            headers: { authorization: "Bearer " + token, accept: "application/json" },
            redirect: "error",
            signal: AbortSignal.timeout(15_000),
          },
        )
        if (!response.ok)
          throw new Error(`Databricks app resource lookup failed (${response.status}).`)
        const app = await response.json()
        if (typeof app.url !== "string" || !app.url.trim())
          throw new Error("Databricks returned no URL for the app resource.")
        const target = httpUrl(app.url, `${service.label} app URL`)
        targets.set(service.name, target)
        return target
      })().finally(() => { pendingTargets.delete(service.name) })
      pendingTargets.set(service.name, pending)
    }
    return pendingTargets.get(service.name)
  }

  return async (service) => {
    if (env.DATABRICKS_APP_NAME && !service.configured)
      throw new Error(`${service.targetEnv} must be configured in Databricks Apps.`)
    const token = await bearerToken(service)
    const target = await appTarget(service, token)
    return { ...service, target, token }
  }
}
