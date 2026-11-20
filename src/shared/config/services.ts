import { SERVICES } from "../../../config/serviceRegistry.mjs"
import { normalizeBaseUrl } from "./serviceUrls"

/** Names of the backend services, taken from config/serviceRegistry.mjs. */
export type ServiceName = keyof typeof SERVICES

export const serviceNames = Object.keys(SERVICES) as ServiceName[]

export const serviceLabel = (service: ServiceName): string =>
  SERVICES[service].label

/**
 * Base URL the browser uses for a service. Empty (the default) means the same
 * origin, where the frontend server proxies the request. Setting the
 * service's VITE_*_API_URL makes the browser call that URL directly.
 */
export function resolveBaseUrl(service: ServiceName): string {
  const envName = SERVICES[service].browserUrlEnv
  const raw = (import.meta.env as Record<string, string | undefined>)[envName]
    ?? (service === "map" ? import.meta.env.VITE_API_BASE_URL : undefined)
  return normalizeBaseUrl(raw, envName)
}
