import { requestJson } from "@/shared/api/httpClient"
import type { MapDataset } from "../types"
export const mapService = {
  loadDataset: () => requestJson<MapDataset>("/map/dataset"),
}
