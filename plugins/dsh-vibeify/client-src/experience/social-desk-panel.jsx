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
  const composer = manualComposerUrl(item.channel);
  const configured = channel?.configured === true;
  const canApprove = item.mode === "ready-to-post" || configured;
  return (
    <article className="vfx-social-item" data-status={item.status}>
      <header>
        <div><span>{item.channelLabel}</span><strong>{socialStatusLabel(item.status)}</strong></div>
        <small>{item.mode === "official-api" ? configured ? "Official API connected" : "Connect in DSH Settings" : "Reviewed manual post"}</small>
      </header>
      {item.lastError === null ? null : <p className="vfx-social-warning">{item.lastError.message}</p>}
      {reviewable ? (
        <label className="vfx-social-copy">
          <span>Final post — {text.length}/{item.maxLength}</span>
          <textarea value={text} maxLength={item.maxLength} onChange={(event) => setText(event.target.value)} />
        </label>
      ) : <p className="vfx-social-final">{item.text}</p>}
      {reviewable && item.mode === "official-api" ? (
        <label className="vfx-social-time">
          <span>Publish time</span>
          <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          <small>{item.suggested?.note}</small>
        </label>
      ) : null}
      {item.scheduledAt === null || reviewable ? null : <p className="vfx-social-schedule">Scheduled for {new Date(item.scheduledAt).toLocaleString()}</p>}
      <div className="vfx-social-actions">
        {reviewable ? (
          <button type="button" className="is-primary" disabled={busy || !canApprove || text.trim().length < 3} onClick={() => onApprove(item, text, item.mode === "official-api" ? utcDateTime(scheduledAt) : null)}>
            {item.mode === "official-api" ? "Approve and schedule" : "Approve · Ready to post"}
          </button>
        ) : null}
        {manualReady ? <button type="button" onClick={() => onCopy(item)}>Copy post</button> : null}
        {manualReady && composer !== null ? <a href={composer} target="_blank" rel="noreferrer">Open {item.channelLabel}</a> : null}
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
        <p>Review every post here. Official connections publish only after one explicit <strong>Approve and schedule</strong> action. Reddit, Discord and other community routes wait as <strong>Ready to post</strong>.</p>
        <div><button type="button" onClick={onBack}>Back to Vibe</button><small>{capability?.timezone ?? "Europe/London"} · missed posts return to review</small></div>
      </div>
      <div className="vfx-social-connections" aria-label="Social channel connection status">
        {(capability?.channels ?? []).map((channel) => (
          <span key={channel.id} data-connected={channel.available}>{channel.label}<small>{channel.mode === "ready-to-post" ? "Ready to post" : channel.configured ? "Connected" : "Not connected"}</small></span>
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

