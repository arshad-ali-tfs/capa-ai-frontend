import {
  resolveBaseUrl,
  serviceLabel,
  type ServiceName,
} from "@/shared/config/services"
import { joinUrl } from "@/shared/config/serviceUrls"

/** A failed request to one of the backend services. status 0 means no response. */
export class ApiError extends Error {
  readonly service: ServiceName
  readonly status: number

  constructor(message: string, service: ServiceName, status: number) {
    super(message)
    this.name = "ApiError"
    this.service = service
    this.status = status
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function messageFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return ""
  const body = payload as { detail?: unknown; message?: unknown }
  const value = body.detail ?? body.message
  if (value === undefined || value === null) return ""
  return typeof value === "string" ? value : JSON.stringify(value)
}

/** A JSON client bound to one backend service. */
export function createServiceClient(service: ServiceName) {
  const label = serviceLabel(service)

  const buildUrl = (path: string) => joinUrl(resolveBaseUrl(service), path)

  async function requestJson<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const url = buildUrl(path)
    const headers = new Headers(init.headers ?? {})
    if (init.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }

    let response: Response
    try {
      response = await fetch(url, { ...init, headers })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error
      }
      throw new ApiError(
        `${label} is unreachable. Check that the service is running and its address is configured.`,
        service,
        0,
      )
    }

    const text = await response.text()
    const payload = text ? parseJson(text) : null

    if (!response.ok) {
      throw new ApiError(
        messageFromPayload(payload) ||
          text ||
          `${label} request failed with status ${response.status}`,
        service,
        response.status,
      )
    }

    return (payload ?? {}) as T
  }

  return { service, buildUrl, requestJson }
}
