import { test, expect } from "@playwright/test"
import { parseIndexInfo, parseRecordDetail, parseSearchResponse } from "../../src/features/match/services/parse"
import { criticalityTone, formatOpenedDate, matchesLabel, siteLine, statusTone, wordCount } from "../../src/features/match/utils"
import { parseRoute } from "../../src/app/routes"
import { details, index, rows, searchResponse, sites, snapshotId } from "../fixtures/match-dataset"

test("parses the live search contract without changing source IDs, rank or score meaning", () => {
  const value = searchResponse("plate alert")
  value.results = [{ ...rows[0], pr_id: "00042", match_score: 0 }, rows[1]]
  const result = parseSearchResponse(value)
  expect(result.rows.map(row => row.deviationId)).toEqual(["00042", rows[1].pr_id])
  expect(result.rows[0]).toMatchObject({ site: sites[0], score: "0.000", scoreLabel: "Hybrid score", matchedField: "Description", snapshotId })
  expect(result.totalCount).toBe(2)
  expect(result.scope).toBe("All allowed sites")
})

test("rejects malformed search results, ambiguous IDs, unsafe scores and inconsistent site scope", () => {
  for (const invalid of [
    null, {}, { rows: [] },
    { ...searchResponse("plate alert"), results: [null] },
    { ...searchResponse("plate alert"), result_count: 3 },
    { ...searchResponse("plate alert"), results: [rows[0], rows[0]] },
    ...["", null, 42].map(id => ({ ...searchResponse("plate alert"), results: [{ ...rows[0], pr_id: id }, rows[1]] })),
    ...[NaN, Infinity, -0.01, 1.01, "0.8"].map(score => ({ ...searchResponse("plate alert"), results: [{ ...rows[0], match_score: score }, rows[1]] })),
    { ...searchResponse("plate alert"), all_sites: false, site: sites[0] },
    { ...searchResponse("plate alert"), mock_embeddings: undefined },
  ]) expect(() => parseSearchResponse(invalid)).toThrow("unexpected response")
  expect(parseSearchResponse(searchResponse("nothing matches")).rows).toEqual([])
})

test("record details retain indexed fields, CAPA source IDs and available plan text", () => {
  const expected = parseSearchResponse(searchResponse("plate alert")).rows[0]
  const result = parseRecordDetail(details[0], expected)
  expect(result.sections).toEqual([
    { label: "Description", text: details[0].indexed_field_texts.DETAILED_DESCRIPTION },
    { label: "Conclusion", text: details[0].indexed_field_texts.CONCLUSION },
  ])
  expect(result.capas[0]).toEqual({ capaId: "CAPA-104", status: "Effectiveness check", title: "Clarify alert response steps", capaType: "Corrective action", summary: "Updated the alert-response checklist." })
  expect(parseRecordDetail({ ...details[0], indexed_field_texts: undefined, text: "Retained text", related_capas: [] }, expected).sections).toEqual([{ label: "Indexed text", text: "Retained text" }])
})

test("rejects another record, site or source version and malformed source/CAPA values", () => {
  const expected = parseSearchResponse(searchResponse("plate alert")).rows[0]
  for (const patch of [{ pr_id: "other" }, { site: sites[1] }, { source_snapshot_id: "other" }])
    expect(() => parseRecordDetail({ ...details[0], ...patch }, expected)).toThrow("different record, site or source version")
  for (const patch of [{ related_capas: null }, { related_capas: [{}] }, { indexed_field_texts: { CONCLUSION: 42 } }])
    expect(() => parseRecordDetail({ ...details[0], ...patch }, expected)).toThrow("unexpected response")
})

test("coverage uses authorised searchable records without inventing a refresh time", () => {
  expect(parseIndexInfo(index)).toEqual({ records: 3, sites: [{ site: sites[0], count: 2 }, { site: sites[1], count: 1 }], modelName: index.model_name, snapshotId, mockEmbeddings: false })
  for (const patch of [{ ready: false }, { searchable_records: -1 }, { allowed_sites: null }, { allowed_sites: [index.allowed_sites[0], index.allowed_sites[0]] }, { mock_embeddings: undefined }])
    expect(() => parseIndexInfo({ ...index, ...patch })).toThrow()
})

test("display helpers and MATCH routes remain compatible with MAP", () => {
  expect(formatOpenedDate("2026-09-18")).toBe("18 Sep 2026")
  expect(formatOpenedDate("2026-01-05T10:00:00Z")).toBe("05 Jan 2026")
  expect(formatOpenedDate("2026-13-01")).toBe("2026-13-01")
  expect(siteLine({ site: sites[0], openedDate: "2026-09-18" })).toBe(`${sites[0]} • 18 Sep 2026`)
  expect(matchesLabel(1, 1)).toBe("1 match returned")
  expect(wordCount("  two   words ")).toBe(2)
  expect(criticalityTone(" major ")).toBe("amber")
  expect(statusTone("CLOSED")).toBe("green")
  expect(parseRoute("/match")).toEqual({ type: "match" })
  expect(parseRoute("/match/extra")).toEqual({ type: "not-found" })
  expect(parseRoute("/map")).toEqual({ type: "overview" })
})
