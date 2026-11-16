# CAPA.AI common frontend

The common React frontend repository. At this stage it contains the supplied developer mockup with MAP connected to its independent backend. Other capabilities can be added when their frontend code arrives. Existing planned-module cards are visual placeholders from the supplied mockup; they do not connect to other services.

The [MAP backend](https://github.com/rahul-jha-tfs/capa-ai-map-backend) runs separately and provides the source-backed dataset over HTTP.

## Run locally

Node.js 22 or later and npm are required. Start the MAP backend at http://127.0.0.1:8101, then run:

~~~powershell
npm ci
npm run build
npm run start
~~~

Open http://127.0.0.1:8100. For development, use npm run dev instead of npm run start. The default backend target is http://127.0.0.1:8101; override MAP_API_TARGET in a local .env if needed.

## Scope and connection

The supplied Home, MAP overview, cluster detail and evidence-review screens are retained. The frontend loads GET /map/dataset through its server-side proxy. Filtering, drill-down, analytics disclosures, navigation and saved record annotations work with this contract. Filters are retained in the URL across MAP pages and reloads. Each page identifies its selected analysis and source coverage; the dashboard does not imply that the entire source has been analysed. The existing annotation panel saves to the MAP backend with version conflict checks. There are no added analysis-run screens, extraction panels or cross-service handoffs.

The production server serves dist and proxies only MAP requests. It needs no Python installation or sibling source folder. MAP_API_BEARER_TOKEN, when needed for a configured upstream, is read only by the server. Model credentials belong in the backend, never in VITE_* variables.

Evidence review displays the backend's structured source fields with their original text, field navigation and an optional full-text view. Matching details and annotation controls sit alongside the source on laptop/desktop screens, with direct source/review navigation on smaller screens. Older API responses retain their complete original narrative without guessing field boundaries.

## Layout

~~~text
src/app/              Supplied application shell and routes
src/features/map/     Supplied MAP screens, state and API service
src/features/landing/ Supplied landing screen
src/shared/           Supplied reusable components and HTTP wrapper
public/               Supplied static assets
server.mjs            Static serving and MAP-only proxy
vite.config.mjs       Local development proxy and build configuration
tests/                Responsive browser checks and fictional test fixtures
~~~

## Verify

~~~powershell
npm run typecheck
npm run build
npx playwright install chromium
npm test
~~~

Default browser tests use fictional request fixtures, which are kept outside application source. To test against the running MAP backend:

~~~powershell
$env:MAP_REAL_DATA='1'
npm test
~~~

The application itself always loads real API data and has no sample-data fallback. Reviewer annotations are saved explicitly through MAP. Unsaved edits pause refresh and are protected when leaving the workspace. Automatic refresh checks run every minute and when returning to the visible app; failed refreshes keep the previous valid analysis visible. CAPA context follows explicit source relationships, and unavailable source filters are disabled with an explanation. See [verification](VERIFICATION.md) and [Databricks deployment preparation](DEPLOYMENT.md).
