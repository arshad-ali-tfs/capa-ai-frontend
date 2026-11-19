import { test, expect } from "@playwright/test"
import fs from "node:fs"
import { overviewMetrics, formatShare } from "../../src/features/map/overviewMetrics"
import { validateDataset } from "../../src/features/map/services/mapService"
import type { CapaRelationship, MapDataset } from "../../src/features/map/types"

const fixture: MapDataset = JSON.parse(fs.readFileSync(new URL("../fixtures/map-dataset.json", import.meta.url), "utf8"))
const capa = (id: string, status: string, recordIds: string[]): CapaRelationship => ({ id, status, recordIds, description: "Fictional action" })

test("criticality keeps unknown classifications in the total and includes unassigned deviations", () => {
  const records = structuredClone(fixture.records)
  records[0].criticality = " major "
  records[0].volume = 2
  records[1].criticality = "Minor"
  records[2].criticality = "Not provided"
  records[2].clusterId = ""
  const result = overviewMetrics(records, [], true)
  expect(result.total).toBe(4)
  expect(result.criticality).toEqual([{ label: "Minor", count: 1 }, { label: "Major", count: 2 }, { label: "Critical", count: 0 }])
  expect(result.unknownCriticality).toBe(1)
  expect(formatShare(2, 4)).toBe("50.0%")
})

test("top DR type groups case and whitespace, includes missing types in percentages and retains ties", () => {
  const records = structuredClone(fixture.records)
  records[0].drType = " Site Deviation "
  records[1].drType = "Product Deviation"
  records[2].drType = "Not provided"
  let result = overviewMetrics(records, [], true)
  expect(result.topDrTypes).toEqual([{ label: "Product Deviation", count: 1 }, { label: "Site Deviation", count: 1 }])
  expect(result.unknownDrType).toBe(1)
  expect(formatShare(result.topDrTypes[0].count, result.total)).toBe("33.3%")
  records[1].drType = "site deviation"
  result = overviewMetrics(records, [], true)
  expect(result.topDrTypes).toEqual([{ label: "Site Deviation", count: 2 }])
})

test("implemented counts deviations once, excludes cancelled/unspecified/open CAPAs and follows filters", () => {
  const records = structuredClone(fixture.records)
  records[2].clusterId = ""
  const capas = [
    capa("a", "Closed - Done", [records[0].id, records[2].id]),
    capa("b", " closed - done ", [records[0].id]),
    ...["Closed - Cancelled", "Closed", "Implementation", "Not provided"].map((status, i) => capa(`excluded-${i}`, status, [records[1].id])),
    capa("outside", "Closed - Done", ["OUTSIDE-RUN"]),
  ]
  expect(overviewMetrics(records, capas, true).implemented).toBe(2)
  expect(overviewMetrics(records.filter(record => record.site === records[1].site), capas, true).implemented).toBe(0)
  expect(overviewMetrics(records, [], true).implemented).toBe(0)
})

test("missing CAPA coverage and empty views never manufacture an implementation rate", () => {
  expect(overviewMetrics(fixture.records, undefined, true).implemented).toBeNull()
  expect(overviewMetrics(fixture.records, [], false).implemented).toBeNull()
  const empty = overviewMetrics([], [], true)
  expect(empty.total).toBe(0)
  expect(empty.implemented).toBeNull()
  expect(empty.topDrTypes).toEqual([])
  expect(formatShare(0, 0)).toBe("—")
  const unknown = structuredClone(fixture.records)
  unknown.forEach(record => record.drType = "Not provided")
  expect(overviewMetrics(unknown, [], true).topDrTypes).toEqual([])
})

test("dataset validation rejects malformed or foreign CAPA relationships and supports older services", () => {
  const dataset = structuredClone(fixture)
  dataset.capas = [capa("a", "Closed - Done", [dataset.records[0].id])]
  expect(validateDataset(dataset).capas).toEqual(dataset.capas)
  for (const invalid of [null, {}, [{}], [capa("a", "Closed - Done", ["OUTSIDE-RUN"])], [dataset.capas[0], dataset.capas[0]], [capa("a", "Closed - Done", [])]]) {
    expect(() => validateDataset({ ...dataset, capas: invalid })).toThrow("invalid dataset")
  }
  delete dataset.capas
  expect(validateDataset(dataset).capas).toBeUndefined()
})
