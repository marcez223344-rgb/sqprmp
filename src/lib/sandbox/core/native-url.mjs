/**
 * Imported first by the sandbox worker. Next.js installs its own global URL in the server
 * runtime and the worker inherits it; PGlite locates its wasm/data files with
 * `new URL(..., import.meta.url)` and Node's fs then rejects the instance
 * ("must be ... an instance of URL. Received an instance of URL"), so the engine never boots.
 * ES module bodies run in import order, so restoring the native class here happens before
 * PGlite is evaluated.
 */
import { URL as NodeURL, URLSearchParams as NodeURLSearchParams } from "node:url";

if (globalThis.URL !== NodeURL) globalThis.URL = NodeURL;
if (globalThis.URLSearchParams !== NodeURLSearchParams)
  globalThis.URLSearchParams = NodeURLSearchParams;
