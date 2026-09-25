# Vibe Social Desk

Vibeify uses simple, reader-led link sharing. It does not schedule social posts, connect social accounts, or publish to platform APIs.

For an already public article, track or other source, choose **Share link** on its Vibe card. The card offers the browser's native share sheet when available and always keeps **Copy link** plus a selectable URL as a fallback. The reader chooses a destination and completes any final action there.

A private Vibe article stays private while its cleaned preview is open. The reader must choose **Publish public link** before the share page displays link-sharing controls. This publishes one article to the Vibe share site; it does not post that link to a social network. A later social post is a separate action in the chosen service.

The old Social Desk queue remains at `DSH_HOME/vibe-social-desk/queue.json` so its records are available for recovery. The current compatibility service reads the queue without changing it. It has no scheduler, connector, account settings, or write path; legacy prepare, approve, cancel, retry, and record-post requests are rejected as disabled. Existing approved or in-flight records do not resume automatically. Queue rows are not deleted or rewritten by Vibeify.

No account connection, token, platform permission, browser automation, queue approval, scheduled time or unattended post is required for link sharing.
