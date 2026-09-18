/**
 * Applies the saved or system theme before first paint to avoid a flash.
 * Inline script requires the per-request CSP nonce (src/proxy.ts).
 */
const script = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function ThemeScript({ nonce }: { nonce?: string }) {
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} />;
}
