/**
 * Zod v3 — API classique (`.min()`, `.email()`, `.refine()`…) sans le probe
 * `new Function("")` de Zod v4 (`allowsEval`), qui déclenche une violation CSP
 * en production (`script-src` sans `unsafe-eval`).
 *
 * Ne pas importer depuis "zod" (alias v4) côté client.
 */
export { z } from "zod/v3";
