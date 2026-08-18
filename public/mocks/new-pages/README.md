# New Page Mock Data

Use this folder for local, static JSON payloads used by new pages during design/development.

## Conventions

- Keep files page-scoped (for example `quality-overview.json`, `pipeline-cards.json`).
- Keep payloads deterministic and small.
- Prefer stable keys so UI development does not break when fields are reordered.

## Usage

Client components can fetch directly from `/mocks/new-pages/<file>.json`.

Example:

```ts
const response = await fetch('/mocks/new-pages/sample-dashboard.json');
const data = await response.json();
```
