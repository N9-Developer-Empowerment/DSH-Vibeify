# Vibe Social Desk

Vibe Social Desk is an optional DSH companion for people who have something worth sharing but do not want to spend the day copying the same article between websites.

It adds two routes:

1. Choose **Prepare social posts** on a finished Vibe card.
2. Open **Social Desk** at the top of Vibe to review the local queue.

The desk makes different starting copy for each selected channel. The reader can edit every word. A draft has no publishing authority.

## One clear approval

An official-API post is allowed to publish only after the reader chooses **Approve and schedule** for the exact final copy and exact time. That single action is the approval: the deterministic scheduler does not ask again when the time arrives, and it does not call a model or rewrite the post at publish time.

The first official connectors are:

- X using an official user-context access token;
- Bluesky using a handle and app password;
- Threads using the official Threads API;
- a Facebook Page using the official Graph API; and
- a professional Instagram account using the official Graph API and a public article image.

Each connector is off until it is configured locally under **Settings → Vibe Social Desk**. The repository contains no username, account id, email address, token or app password. Credentials are write-only DSH credential references: the host resolves one for an operation and never returns it through the browser queue.

## Ready to post means ready—not secretly posted

Reddit, Discord, YouTube Community, Facebook personal profiles and unsupported or unconfigured routes remain **Ready to post**. Social Desk can prepare useful community-specific copy, put it on the clipboard and open the relevant website. It does not automate a personal browser session, solve a CAPTCHA, imitate human activity, hide an official integration, or claim a manual item was posted before the reader records or verifies it.

For Reddit and Discord, the draft is deliberately more than a generic link drop. It offers a useful observation, build note or genuine question suitable for a named community. The reader remains responsible for its rules and context.

## Local queue and restart behaviour

The queue is stored at `DSH_HOME/vibe-social-desk/queue.json` (normally inside the local `.dsh` directory) with owner-only file permissions. It contains the cleaned public title, bounded excerpt, selected public link/image, final channel copy, schedule, status and a non-secret approval receipt. It does not contain prompts, Chat history, reasoning, attachments, unrelated cards or credentials.

Statuses are plain:

- **Review draft** — edit it; nothing may publish.
- **Scheduled** — exact approved copy is waiting for its time.
- **Posting** — one official request is in flight.
- **Posted** — a remote receipt was recorded.
- **Retry queued** — a bounded retry is waiting after a definite failure.
- **Ready to post** — reviewed manual action remains with the reader.
- **Review again** — a schedule was missed too long, or delivery became uncertain.

DSH checks due official posts every 30 seconds while it is open. It does not pretend to be a cloud service when the computer is asleep. A post missed by more than the configured safe window returns to **Review again**. If DSH stopped while a request was in flight, Social Desk asks the reader to check the channel before approving again; avoiding a duplicate matters more than automatic recovery.

## Provider and Codex boundary

The deterministic queue and official connectors do not require Codex. DeepSeek or Codex may help draft public copy only when the reader explicitly asks and permits that provider to receive the public article text. Neither provider receives social credentials or the local queue.

Codex can help open a manual composer or verify a live public result when its browser capability is available. That does not turn a manual route into an API connector and does not remove the reader's review.

