import React from "react";

import { manualComposerUrl, socialStatusLabel } from "./social-desk-client.js";

function localDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function utcDateTime(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function QueueItem({ item, channel, busy, onApprove, onCancel, onCopy, onMarkPosted }) {
  const [text, setText] = React.useState(item.text);
  const [scheduledAt, setScheduledAt] = React.useState(() => localDateTime(item.scheduledAt ?? item.suggested?.scheduledAt));
  React.useEffect(() => {
    setText(item.text);
    setScheduledAt(localDateTime(item.scheduledAt ?? item.suggested?.scheduledAt));
  }, [item.id, item.revision]);
  const reviewable = item.status === "draft" || item.status === "stale/review";
  const manualReady = item.status === "ready-to-post";
  const composer = manualComposerUrl(item.channel, item);
  const automatic = item.mode === "official-api";
  return (
    <article className="vfx-social-item" data-status={item.status}>
      <header>
        <div><span>{item.channelLabel}</span><strong>{socialStatusLabel(item.status)}</strong></div>
        <small>{automatic ? "Optional automatic posting" : "No connection needed · you make the final click"}</small>
      </header>
      {item.lastError === null ? null : <p className="vfx-social-warning">{item.lastError.message}</p>}
      {reviewable ? (
        <label className="vfx-social-copy">
          <span>Final post — {text.length}/{item.maxLength}</span>
          <textarea value={text} maxLength={item.maxLength} onChange={(event) => setText(event.target.value)} />
        </label>
      ) : <p className="vfx-social-final">{item.text}</p>}
      {reviewable ? (
        <label className="vfx-social-time">
          <span>Publish time</span>
          <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          <small>{item.suggested?.note}</small>
        </label>
      ) : null}
      {item.scheduledAt === null || reviewable ? null : <p className="vfx-social-schedule">Scheduled for {new Date(item.scheduledAt).toLocaleString()}</p>}
      <div className="vfx-social-actions">
        {reviewable ? (
          <button type="button" className="is-primary" disabled={busy || text.trim().length < 3 || utcDateTime(scheduledAt) === null} onClick={() => onApprove(item, text, utcDateTime(scheduledAt))}>
            Approve and schedule
          </button>
        ) : null}
        {manualReady && composer !== null ? <a className="is-primary" href={composer} target="_blank" rel="noreferrer" onClick={() => onCopy(item)}>Copy and open {item.channelLabel}</a> : null}
        {manualReady ? <button type="button" onClick={() => onCopy(item)}>Copy only</button> : null}
        {manualReady && item.snapshot?.visual?.imageUrl ? <a href={item.snapshot.visual.imageUrl} target="_blank" rel="noreferrer">Open article image</a> : null}
        {manualReady ? <button type="button" onClick={() => onMarkPosted(item)}>Mark posted</button> : null}
        {["posted", "cancelled", "posting"].includes(item.status) ? null : <button type="button" className="is-quiet" disabled={busy} onClick={() => onCancel(item)}>Cancel</button>}
        {item.remoteUrl === null ? null : <a href={item.remoteUrl} target="_blank" rel="noreferrer">View post</a>}
      </div>
    </article>
  );
}

export function SocialDeskPanel({ capability, items, busyId, notice, onApprove, onCancel, onCopy, onMarkPosted, onBack }) {
  const byChannel = new Map((capability?.channels ?? []).map((channel) => [channel.id, channel]));
  const active = items.filter(({ status }) => status !== "cancelled");
  return (
    <section className="vfx-social-desk" aria-labelledby="vfx-social-title">
      <div className="vfx-social-hero">
        <span>Vibe Social Desk · local and reviewed</span>
        <h1 id="vfx-social-title">One good article. The right words for each room.</h1>
        <p>No developer account is required. Review and schedule each post; when its time arrives, Vibeify makes it <strong>Ready to post</strong>. One button copies your words and opens the real social composer. You make the final public click. Optional official connections can publish unattended after the same explicit approval.</p>
        <div><button type="button" onClick={onBack}>Back to Vibe</button><small>{capability?.timezone ?? "Europe/London"} · missed posts return to review</small></div>
      </div>
      <div className="vfx-social-connections" aria-label="Social channel connection status">
        {(capability?.channels ?? []).map((channel) => (
          <span key={channel.id} data-connected="true">{channel.label}<small>{channel.publishingMode === "official-api" ? "Optional automatic posting on" : "No connection needed"}</small></span>
        ))}
      </div>
      {notice === null ? null : <p className="vfx-social-notice" role="status">{notice}</p>}
      {active.length === 0 ? (
        <div className="vfx-social-empty"><strong>Your desk is clear.</strong><p>Return to Vibe and choose <em>Prepare social posts</em> on an article worth sharing.</p></div>
      ) : (
        <div className="vfx-social-queue">
          {active.map((item) => <QueueItem key={item.id} item={item} channel={byChannel.get(item.channel)} busy={busyId === item.id} onApprove={onApprove} onCancel={onCancel} onCopy={onCopy} onMarkPosted={onMarkPosted} />)}
        </div>
      )}
    </section>
  );
}
