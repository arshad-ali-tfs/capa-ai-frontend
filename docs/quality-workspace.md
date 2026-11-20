# Investigator workspace changes

MAP and MATCH changes on `codex/map-match-quality-20261120` require the corresponding backend branch. The separate `codex/map-approved-updates-20261120` frontend release contains only the approved top-three DR KPI, implemented/raised CAPA KPI and severity chart toggle.

MAP shows the analysed opened-date window and source population separately. Suggested parent themes organize detailed clusters; they require member review. Cluster labels and record assignments can be reviewed with a name, rationale and revision check. A split creates a subgroup and moves the record in one operation. These changes are overlays; original source records, assignments and AI summaries remain available. An original summary is labelled stale after membership changes. Saved runs can be compared without regenerating them.

MATCH applies deterministic date, severity, site and status scope before ranking. Applied criteria and unavailable AI review remain visible. Original source fields are independent of normalized retrieval text. Overviews use bounded source passages, verified quotations and linked-CAPA arithmetic; unsupported findings are omitted. A chronology question does not itself establish recurrence.

The investigation workspace compares up to six cases and retains inclusion/exclusion rationale. Drafts remain in the current browser tab. Explicit Save stores criteria, results, available overview, selected original evidence (including exclusions), source/index versions and the assistant recipe on the backend. Saved investigations can be reopened after search-cache expiry or exported as JSON. Long-query links depend on tab storage; an unavailable stored query requires re-entry rather than an automatic broader search.

Attachments are absent from the supplied source export. Narrative CAPA mentions do not prove a retained relationship or status, and completion does not prove effectiveness. Equipment/location mentions are cited source text, not validated structured event metadata. Metadata counts are exact within the indexed scope; an exhaustive semantic event count needs a reviewed event definition and classification.

## Verification

Run `npm run typecheck` and `npm run test:unit`. Browser tests accept `CAPA_TEST_BASE_URL` and `CAPA_TEST_BROWSER_CHANNEL`; the default URL is 8100. Use the isolated test URL when preserving an existing release. Build experiments with an explicit separate `--outDir`, leaving the approved release directory intact.
