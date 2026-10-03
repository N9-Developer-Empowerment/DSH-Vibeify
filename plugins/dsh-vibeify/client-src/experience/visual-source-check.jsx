import React from "react";
import { checkVisualSources, VISUAL_SOURCE_LABELS as LABELS } from "./visual-source-check.js";

export function VisualSourceCheck({ connection }) {
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");
  const check = async () => {
    setPending(true); setError("");
    try { setResult(await checkVisualSources(connection)); }
    catch { setError("Image sources could not be checked. Try again shortly."); }
    finally { setPending(false); }
  };
  return <section style={{ marginTop: 18 }}>
    <div className="dsh-vibeify-visual-actions"><button onClick={check} disabled={pending}>{pending ? "Checking image sources…" : "Check image sources"}</button></div>
    <p className="dsh-vibeify-visual-note">Checks a public “red bicycle” search and displays a credited sample.</p>
    <p role="status">{error || (result ? `${result.ready.map(provider => LABELS[provider]).join(" · ") || "No sources"} responded.${result.failed.length ? ` Could not reach: ${result.failed.map(provider => LABELS[provider]).join(" · ")}.` : ""}` : "")}</p>
    {result?.image && <figure style={{ maxWidth: 520, margin: "12px 0" }}>
      <img src={result.image.imageUrl} alt={result.image.alt} referrerPolicy="no-referrer" style={{ width: "100%", maxHeight: 220, objectFit: "cover" }} />
      <figcaption><a href={result.image.sourceUrl} target="_blank" rel="noreferrer">{result.image.credit}</a></figcaption>
    </figure>}
    {result && !result.image && <p>No suitable sample loaded. VIBE keeps its local cover when this happens.</p>}
  </section>;
}
