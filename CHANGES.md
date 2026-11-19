# MAP KPI layout and severity detail · 19 November 2026

The overview and cluster detail use the same responsive KPI design: aligned cards, larger primary counts, quieter denominators and aligned explanatory footers. Minor, Major and Critical appear side by side with counts and shares. Nonzero Major/Critical counts have distinct text emphasis; zero counts stay muted. Top DR type has a secondary share bar, and CAPA completion highlights the qualifying deviation count while keeping the denominator visible.

Cluster detail replaces the combined Major / Critical card with the complete Criticality breakdown and replaces Review records with Top DR type. Both use only that cluster's currently filtered deviations. Median historical duration now displays its day unit and the number of records with valid dates.

The cluster summary uses separate Minor, Major and Critical columns, each with a count and percentage. Numeric columns are aligned, and other/unknown classifications remain visible. The summary uses the full content width; the optional volume chart is expandable above it. Narrower content areas use readable cluster cards with the same severity breakdown. Tooltips and source definitions remain available throughout. All displayed numbers continue to follow the selected saved analysis and current filters.

Validation: TypeScript and production build passed, with all 32 unit tests and 132 MAP browser checks across desktop, tablet and phone. An additional 21 focused checks passed for the final narrow-screen labels, tooltips, KPI scope and layout. Added scenarios cover separate severity columns, unknown classifications, cluster-only DR type ties, filter and empty-state behavior, median duration scope and card alignment. Live read-only checks compare the saved 1,000-record analysis and its 77-record cluster 28 against the API at widths 1440, 820, 390 and 320. Screenshots and the check report are in ignored `.local/map-ux-*` files.

# MAP overview KPIs · 19 November 2026

The overview keeps Active clusters and replaces Top 5 share, Average cluster similarity and the red Open cluster card with:

- Criticality: Major, Minor and Critical counts and percentages against all filtered deviations. Other or missing classifications are shown separately and stay in the denominator.
- Top DR type: the most frequent known source DR type, with its count and percentage. Equal leaders are reported as a tie and named in the tooltip.
- CAPA implemented: deviations with at least one source-linked CAPA marked `Closed - Done`, divided by all filtered deviations. Each deviation counts once. The tooltip states that this status is the completion indicator because the export has no separate implementation flag; cancelled CAPAs are excluded. Missing source coverage or an older API without the run-level CAPA collection shows Not available.

All values follow the selected analysis and filters, including unassigned records. The backend now supplies a run-level `capas` collection and resolves integer-as-decimal parent links from spreadsheet exports, preserving exact source IDs. Cluster and evidence navigation remains available through the tables.

Validation: production build; 32 frontend unit tests; 51 MAP browser checks across desktop, tablet and phone. Live read-only checks of the saved 1,000-record analysis passed at widths 1440, 1840 and 390: Major 377, Minor 607, Critical 16, Product Complaint 381/1,000 and completed-CAPA deviations 25/1,000. Screenshots and the live check report are in ignored `.local/map-kpis-*` files. No analysis rerun was needed.

# MATCH screen integration

Integrated the `matchscreen` branch at commit `5c31458ef3da43bf7d12b7b1d00c299644266f98` into the current frontend working copy. Existing MAP tooltips, catalogue-warning boundaries and restored-source metadata are retained.

The supplied search/results/detail layout, Home and navigation links, and shared service registry are connected to the standalone MATCH backend. The branch's assumed API is adapted to the verified `capa_match.main` contract:

- `/index` provides actual searchable coverage and allowed sites. The API supplies no refresh timestamp.
- `/search` requires a site or `all_sites: true`, plus a result limit, and returns `results` with original source IDs and hybrid scores.
- `/matched-records/{pr_id}?site=...` supplies indexed source fields and CAPAs. The backend has no `/capa` or `/refresh-time` route.
- Details are checked against the selected record, site and snapshot. Switching candidates cancels the previous detail request.
- UI labels distinguish the matched excerpt, retained indexed text and source-linked CAPAs. Mock embeddings display a demonstration warning.

`MAP_API_TARGET` and `MATCH_API_TARGET` configure the server-side proxy. Local ports remain 8100/8101/8102. No additional frontend packages are required. AUTHOR has a service-registry entry but its workspace remains a placeholder. Existing `VITE_API_BASE_URL` MAP overrides remain supported; `VITE_MAP_API_URL` takes precedence.

Validation commands:

```powershell
npm run build
npm run test:unit
npm test
```

Browser tests use fictional responses matching the real backend schema. They cover scope, ranking, details, empty/error states, retries, stale responses, source-version mismatches and responsive layouts. MAP tests remain in the same suite.
