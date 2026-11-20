// Fictional records shaped like the standalone capa_match.main API.
export const snapshotId = "a".repeat(64)
export const sites = ["Northbridge (NBR)", "Rivendell (RVD)"]
export const index = {
  ready: true,
  model_name: "sentence-transformers/all-mpnet-base-v2",
  mock_embeddings: false,
  searchable_records: 3,
  allowed_sites: [{ site: sites[0], deviation_count: 2 }, { site: sites[1], deviation_count: 1 }],
  source_snapshot_id: snapshotId,
}
export const rows = [
  {
    pr_id: "DEV-260184", site: sites[0], date_opened: "2026-09-18", status: "In review", criticality: "Major",
    match_score: 0.86, matched_field: "DETAILED_DESCRIPTION", matched_excerpt: "A settle-plate reading exceeded the site action level.",
  },
  {
    pr_id: "DEV-260127", site: sites[1], date_opened: "2026-08-04", status: "Closed", criticality: "Minor",
    match_score: 0.79, matched_field: "CONCLUSION", matched_excerpt: "A monitoring plate was held beyond the transfer window.",
  },
]
export const capa = { pr_id: "CAPA-104", status: "Effectiveness check", record_name: "Clarify alert response steps", capa_type: "Corrective action", plan_excerpt: "Updated the alert-response checklist." }
export const details = rows.map((row, i) => ({
  pr_id: row.pr_id, site: row.site, source_snapshot_id: snapshotId,
  indexed_field_texts: {
    DETAILED_DESCRIPTION: i === 0 ? "During routine monitoring a settle-plate reading exceeded the site action level. Repeat samples were scheduled." : "A monitoring plate stayed in staging beyond the target window.",
    CONCLUSION: "Fictional retained conclusion; verify against the source.",
  },
  related_capas: i === 0 ? [capa] : [],
}))
export function searchResponse(query: string, site = "") {
  const results = query.includes("nothing") ? [] : rows.filter(row => !site || row.site === site)
  return { query, site: site || "All sites", all_sites: !site, result_count: results.length, results, mock_embeddings: false, source_snapshot_id: snapshotId }
}
