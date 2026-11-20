import { createServiceClient } from "./httpClient"

// One client per backend service. Feature code imports from here, so a
// service address is never written anywhere else.
export const mapApi = createServiceClient("map")
export const matchApi = createServiceClient("match")
export const authorApi = createServiceClient("author")
