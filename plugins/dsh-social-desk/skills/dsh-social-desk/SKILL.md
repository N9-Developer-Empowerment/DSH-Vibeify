---
name: dsh-social-desk
description: Explain the simple public-link sharing flow in DSH Vibeify and the read-only handling of legacy Social Desk queues. Use when a Vibe already has a public URL to share or when an old local queue needs explanation. Do not schedule, connect accounts, publish to social APIs, or change legacy queue records.
---

# Vibe Social Desk

Vibeify shares one public link at a time. For a link that already exists, use **Share link** on the Vibe card. Offer the browser share sheet when it is available; **Copy link** and the selectable URL are the universal fallback. A cancelled share sheet is normal. Never say a social post completed merely because a share sheet opened or closed.

For a private Vibe article, keep the preview boundary: show only the cleaned single-article preview, and let the reader choose **Publish public link**. The share page displays the public URL and copy/share controls only after that action succeeds. Publishing an article does not post it to a social network.

The legacy Social Desk queue is read-only. Its old rows remain on disk for recovery, but this plugin does not schedule, prepare, approve, cancel, retry, mark posted, resolve credentials, call social connectors, or change queue contents. Legacy write requests are disabled. Never restart or simulate a legacy worker to finish an old schedule.

Never send prompts, Chat history, reasoning, attachments, account details, credentials or private content to a social service. The user chooses a destination and completes any posting action themselves.
