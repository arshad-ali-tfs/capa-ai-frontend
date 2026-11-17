# MAP UI verification - 16 November 2026

The priority evidence-review fixes passed the production build and TypeScript checks, 60 controlled browser checks, and 21 applicable checks against the real MAP backend. Another 18 controlled boundary checks were skipped in the live-source run, not counted as passes. Reports are in `.local/priority-source-review/browser-fixture-tests.json` and `browser-real-tests.json`.

Follow-up: the original Guided investigation navigation layout was restored on the evidence page. It uses the same desktop side rail and mobile step arrangement as the other MAP pages. The production build and 21 focused browser checks passed after restoration. Five additional real-data screenshots at 320px, 390px, 820px, 1024px and 1440px confirm restored navigation, intact source text and no horizontal overflow or uncaught page errors. Current layout evidence is in `.local/navigation-restoration/`; the earlier screenshots below predate this correction.

- Description, Investigation and Conclusion use explicit backend field boundaries. Exact text, whitespace, line breaks, dates, quantities and identifiers are retained. A heading occurring inside a source field is never treated as a new field. Older API responses remain readable as one intact source text.
- Every record uses the same viewport-based reader, with field navigation, sticky field headings and an expanded full-text option. Keyboard navigation, shorter and longer narratives, and reading/reviewing without losing an unsaved note were tested across desktop, tablet and phone.
- Matching context and annotations share a review column from 1024px upwards. Smaller screens have direct source/review links. A short laptop viewport was checked to confirm that the save controls remain reachable.
- 21 screenshots cover real records 7033, 4715 and 3644 at widths from 320px to 1440px, plus field navigation and a short laptop viewport. No uncaught browser errors or horizontal page overflow were observed. See `.local/priority-source-review/visual-check.json`.
- All 40 record IDs, original narrative strings, cluster assignments and similarity values match the saved pre-change dataset. Structured source sections reproduce each legacy narrative exactly. The historical draft checksum is unchanged. No annotations were saved against this historical analysis during these checks.

This update changes the API presentation contract and evidence-review layout. Extraction inputs, models, clustering and annotation persistence are unchanged. A Databricks deployment has not been performed.

## Previous integration verification - 13 November 2026

The production build and TypeScript checks passed. All four supplied screens were compared with the untouched original mockup, using identical sample content as well as the real historical analysis. Desktop panel relationships, assessment colours, source/interpretation labels and compact progress steps are restored while retaining the source-backed integration.

- 48 controlled browser checks passed across desktop, tablet and phone. These cover delayed saves across record navigation, retained failures/drafts, subsequent saves using the updated revision, restored panel placement, broad row targets, review colours, formatted historical context, filtered scores, missing values, CAPA links, empty/unassigned records, retry and long narratives. 320px layouts were also checked for page overflow.
- 21 applicable browser checks passed with the real standalone MAP service. The 18 controlled boundary checks were excluded from that live-source run, not counted as passes. Reports are in .local/mockup-fixes/browser-fixture-tests.json and browser-real-tests.json.
- Pending save state and errors now live above individual evidence pages. Returning to a record during a save keeps its editor disabled until the request finishes, and a response can clear only the exact draft it saved. Late responses cannot erase a newer draft.
- A clearly fictional analysis was used to save an annotation through the real frontend proxy and backend HTTP endpoint. Reload and backend restart preserved the note/revision; a stale write returned HTTP 409 without replacing it. The active historical analysis was not annotated by the automated tests.
- A separate three-record fictional source snapshot verified two explicit CAPA relationships all the way from source import to backend projection and the browser panel. This is labelled synthetic and is not the operational dashboard source.
- All 40 operational IDs, cluster assignments and original narrative strings match the pre-change dataset. The historical draft artifact checksum is unchanged. The dashboard still shows 40 records and 18 clusters against the same 19,643-record source snapshot.
- 30 updated screenshots were captured at 1440px, 820px and 390px, including expanded panels and identical-content comparisons. The captured pages had no uncaught page errors, page-width overflow or missing small-screen pattern notices. Tables retain semantic headers and mobile cards, collapsed panels keep their own height, and long narratives retain every character. Historical summary formatting preserves prose and values; compact chart labels retain full titles in tooltips and accessible names. See .local/mockup-fixes/browser-verification.json and data-integrity.json.

The application has no sample-data fallback. Fictional fixtures and verification artifacts live outside application source. Saved annotations are local record-review notes, separate from cluster-summary approvals and QMS decisions. The model, prompts, extraction inputs and clustering pipeline were not changed. This work was not pushed to GitHub and was not deployed to Databricks.

## Saved analysis selector — 17 November 2026

The default backend analysis now contains 1,000 historical records in 64 clusters, with 19,643 records in the source snapshot. A compact Analysis run dropdown loads previous completed results using the existing run-specific dataset API. It retains selection in links, filters, browser history and reloads. Switching clears filters from the previous analysis, preserves run-specific annotations, and is disabled during unsaved edits or pending saves. Failed or mismatched responses leave the displayed result intact. Test analyses are explicitly labelled.

The complete controlled browser suite passed 69 checks on desktop, tablet and phone. The expanded selector tests then passed 12 checks, including protection against a response for a different run. Two read-only live browser checks passed on desktop and phone: default 1,000-record coverage, switching to the retained 40-record run, reloading, returning to 1,000 records and opening source evidence. All four previous datasets passed the actual frontend validator. Backend and frontend responses contain identical IDs, scores and all 1,000 source sections. Earlier run files retain their original checksums. These checks do not establish clustering accuracy.

The production TypeScript/Vite build passed. Live captures and test reports are retained under the ignored `.local` directory. No reviewer notes were written to the historical analyses by these checks. All changes remain local.

## Review warnings - 17 November 2026

Close scores no longer produce Needs review badges, cluster warning counts or evidence-page warnings. The backend applies this policy to old analyses and future runs. Missing cluster descriptions and unassigned records retain warnings; missing descriptions explicitly identify a cluster catalogue gap rather than a bad record assignment. Page layouts and the guided investigation navigation are unchanged.

The production TypeScript/Vite build passed. All 72 existing controlled browser checks passed, and six focused warning checks passed across desktop, tablet and phone after correcting a test selector to target the visible responsive badge. These verify no warning/count when no issue is returned and correct counts and specific text for a missing-description warning. No application selector or layout change was required.

Four read-only live browser scenarios verified records 34163 and 11322 on desktop and phone: the former close-only alert is absent, the missing cluster 15 description warning is present, the 1,000-record analysis remains active, and there is no horizontal overflow or uncaught page error. Screenshots and proof are under the ignored `.local` directory. Backend checks confirmed identical frontend/backend datasets, 1,000 records and 64 clusters, unchanged assignments/scores/source text/annotations, and unchanged saved-run files. No pipeline was launched, no paid API calls were made, and no GitHub push was performed.

## Saved 5W1H display - 17 November 2026

The record review screen now shows Who, What, When, Where, Why and How in a panel below the original source narrative. It is labelled as saved AI output for the chosen analysis. Valid text keeps its wording and line breaks; blank values and common unavailable markers display as Not available. Older API responses without extraction metadata remain readable with an explicit unavailable state. Invalid extraction metadata is rejected by the dataset validator.

The guided investigation navigation and existing source/matching/annotation controls retain their layout. The panel uses labelled rows with wrapped text and stacked labels on phones. No editing or regeneration control was added; changing records or analyses loads that result's own saved output.

The production TypeScript/Vite build and all 90 controlled browser checks passed across desktop, tablet and phone. Twelve extraction checks cover exact text, literal markup, Unicode, dates/quantities/IDs, legacy and unavailable values, malformed payloads, and record/run changes across reload. Existing source reader, navigation, warning and annotation checks also passed.

Four read-only live browser scenarios compared every displayed category and original source field against the backend for records 34163 (1,000-record analysis) and 7033 (40-record analysis), on desktop and phone. All values matched, with no horizontal overflow, uncaught page errors or write requests. Screenshots and proof are in `.local/fivewh/` and `.local/fivewh-live-proof.json`. Backend verification additionally matched all 6,240 saved category values and confirmed unchanged run files. No pipeline rerun, paid model call or GitHub push was performed.

## Saved cluster context - 17 November 2026

Cluster context now displays the saved AI summary for the selected analysis as its primary content. Historical descriptions remain separately labelled in an expandable reference. Historical names stay unchanged; clusters without a historical name use their saved analysis title. The summary identifies its full saved cluster record count and explains that filters do not rewrite it. Missing summaries, historical-only results and legacy API responses have explicit fallback states. The panel occupies its existing position; guided navigation and page layout are unchanged.

The production TypeScript/Vite build passed, as did all 105 controlled browser checks across desktop, tablet and phone, with no skipped or failed checks. Fifteen new checks cover separate provenance, missing references, full-cluster scope under filters, saved-run switching/reload and rejection of malformed, wrong-run or wrong-count metadata. See `.local/browser-tests.json`.

Six read-only live scenarios checked clusters 4 and 10 from the 1,000-record analysis and cluster 53 from the older 40-record analysis, on desktop and phone. Every displayed summary and structured footer matched the saved API text exactly. Historical references expanded independently. There were no write requests, uncaught page errors or horizontal overflow. Desktop and phone screenshots were inspected; evidence is in `.local/cluster-context/` and `.local/cluster-context-live-proof.json`.

Backend verification confirmed that all 64 current and 18 older clusters now expose their own saved analysis summaries, including the 13 current clusters without historical references. All 82 inventoried saved-run files, original record data, assignments, scores and annotations remain unchanged. The historical catalogue still covers 53 of 70 model clusters; its gaps are reported rather than filled with invented definitions. No pipeline rerun, paid model call or GitHub push was performed for this update. These checks verify presentation and data preservation, not clustering accuracy.
