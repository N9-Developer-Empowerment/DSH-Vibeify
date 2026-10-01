import React from "react";
import { CODEX_MODELS_CHANNEL } from "../../codex-model-channel.js";

export function effortForModel(model, previous) {
  if (model.efforts.some(({ id }) => id === previous)) return previous;
  return model.efforts.find(({ id }) => id === model.defaultEffort)?.id ?? model.efforts[0]?.id ?? "";
}

function selectionLabel(selection, models) {
  const entry = models.find(({ model }) => model === selection.model);
  const effort = entry?.efforts.find(({ id }) => id === selection.reasoningEffort)?.label ?? selection.reasoningEffort;
  return `${entry?.label ?? selection.model} · ${effort}`;
}

export function CodexModelSettings({ connection }) {
  const [report, setReport] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [revision, setRevision] = React.useState(null);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const mounted = React.useRef(false);
  const operation = React.useRef(0);
  const pending = React.useRef(false);
  const statusPending = React.useRef(false);
  async function load() {
    const current = ++operation.current;
    pending.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await connection.rpc.call(CODEX_MODELS_CHANNEL, "read", {});
      if (!mounted.current || current !== operation.current) return;
      if (!result.ok) throw new Error(result.error?.message);
      setReport(result.value); setDraft(result.value.selection); setRevision(result.value.revision);
    } catch (problem) {
      if (mounted.current && current === operation.current) setError(problem.message || "Models could not be loaded. Try again.");
    } finally { if (mounted.current && current === operation.current) { pending.current = false; setBusy(false); } }
  }
  React.useEffect(() => {
    mounted.current = true;
    load();
    // Local status only: no discovery, inference, or account data.
    const timer = setInterval(async () => {
      if (pending.current || statusPending.current) return;
      const current = operation.current;
      statusPending.current = true;
      try {
        const result = await connection.rpc.call(CODEX_MODELS_CHANNEL, "status", {});
        if (mounted.current && current === operation.current && result.ok) setReport((previous) => previous ? { ...previous, ...result.value } : previous);
      } catch {} finally { statusPending.current = false; }
    }, 5000);
    return () => { mounted.current = false; operation.current += 1; clearInterval(timer); };
  }, [connection]);
  const models = report?.models ?? [];
  const chosen = models.find(({ model }) => model === draft?.model);
  const supported = chosen?.efforts.some(({ id }) => id === draft?.reasoningEffort);
  const changed = report && (draft?.model !== report.selection.model || draft?.reasoningEffort !== report.selection.reasoningEffort);
  async function save() {
    const current = ++operation.current;
    pending.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await connection.rpc.call(CODEX_MODELS_CHANNEL, "save", {
        model: draft.model, reasoningEffort: draft.reasoningEffort, revision,
      });
      if (!mounted.current || current !== operation.current) return;
      if (!result.ok) throw new Error(result.error?.message);
      setReport(result.value); setDraft(result.value.selection); setRevision(result.value.revision);
      setNotice("Saved. Your next Codex turn will use this selection.");
    } catch (problem) {
      if (mounted.current && current === operation.current) setError(problem.message || "The selection could not be saved. Reload and try again.");
    } finally { if (mounted.current && current === operation.current) { pending.current = false; setBusy(false); } }
  }
  return <section className="dsh-vibeify-model-settings" aria-busy={busy}>
    <p className="codex-model-kicker">CODEX LEAD</p>
    <h2>Model and thinking effort</h2>
    <p>Choose the Codex model that plans, verifies and answers. DeepSeek remains available for delegated work.</p>
    {report && <div className="codex-model-status" aria-live="polite">
      <p><strong>Saved for the next turn:</strong> {selectionLabel(report.selection, models)}</p>
      <p><strong>Running now:</strong> {report.active.length ? report.active.map((entry) => selectionLabel(entry, models)).join(", ") : "No Codex turn is running."}</p>
    </div>}
    <div className="codex-model-fields">
      <label>Main Codex model
        <select value={chosen ? draft.model : ""} disabled={busy || !models.length} onChange={(event) => {
          const entry = models.find(({ model }) => model === event.target.value);
          setDraft({ model: entry.model, reasoningEffort: effortForModel(entry, draft?.reasoningEffort) }); setNotice("");
        }}>
          {!chosen && <option value="">{busy ? "Loading available models…" : "Choose an available model"}</option>}
          {models.map((entry) => <option key={entry.model} value={entry.model}>{entry.label}</option>)}
        </select>
      </label>
      <label>Thinking effort
        <select value={supported ? draft.reasoningEffort : ""} disabled={busy || !chosen} onChange={(event) => {
          setDraft({ ...draft, reasoningEffort: event.target.value }); setNotice("");
        }}>
          {!supported && <option value="">Choose a supported effort</option>}
          {(chosen?.efforts ?? []).map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
    </div>
    {report && !chosen && <p>The saved model is not in the available list. Choose a replacement to continue.</p>}
    <div className="codex-model-actions">
      <button type="button" disabled={busy || !supported || !changed} onClick={save}>{busy ? "Please wait…" : "Save selection"}</button>
      <button type="button" disabled={busy} onClick={load}>Reload available models</button>
    </div>
    {error && <p role="alert" className="codex-model-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <p>Only models available to your ChatGPT sign-in with image support are listed. Higher thinking effort can take longer and use more of your allowance. Saving never interrupts a running turn.</p>
  </section>;
}

export function registerCodexModelSettings(ctx, connection) {
  ctx.effect(() => {
    const style = document.createElement("style");
    style.textContent = `
.dsh-vibeify-model-settings{color:var(--dsw-alias-label-primary);max-width:760px;padding:4px 0 24px}
.dsh-vibeify-model-settings h2{font-size:22px;margin:4px 0 12px}
.dsh-vibeify-model-settings p{font-size:13px;line-height:1.55;color:var(--dsw-alias-label-secondary)}
.codex-model-kicker{font-weight:700;letter-spacing:.08em;font-size:11px!important}
.codex-model-status{padding:12px 16px;margin:20px 0;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px}
.codex-model-status p{margin:4px 0;overflow-wrap:anywhere}
.codex-model-fields{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px}
.codex-model-fields label{display:flex;flex-direction:column;gap:8px;font-size:14px;font-weight:600}
.codex-model-fields select,.codex-model-actions button{font:inherit;color:inherit;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:12px;min-width:0}
.codex-model-actions{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}
.codex-model-actions button{cursor:pointer}.codex-model-actions button:disabled{opacity:.55;cursor:default}
.codex-model-fields select:focus-visible,.codex-model-actions button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.codex-model-error{color:var(--dsw-alias-label-error,#b42318)!important}
@media(max-width:600px){.codex-model-fields{grid-template-columns:1fr}}
`;
    document.head.appendChild(style);
    return () => style.remove();
  }, "dsh-vibeify: Codex model settings styles");
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section", id: "codex-capability", order: 15, label: "Codex",
  }, () => <CodexModelSettings connection={connection} />));
}
