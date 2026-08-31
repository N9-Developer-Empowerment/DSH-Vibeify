---
name: dsh-social-desk
description: Configure, diagnose, or explain Vibe Social Desk for DSH Vibeify, including preparing channel-specific drafts, approving and scheduling official-API posts, Ready to post community channels, missed schedules, retries, and local account connections. Use when a Vibe article should become reviewed social posts or the Social Desk queue needs attention. Do not publish unapproved copy, hide automation, bypass platform rules, expose credentials or account metadata, forward private Chat material, or automate manual-only community actions.
---

# Vibe Social Desk

Treat Social Desk as an optional local companion to Vibeify. It receives only the cleaned single-article snapshot that Vibeify already uses for private sharing preview. Never send prompts, Chat history, reasoning, attachments, unrelated cards, settings, account details, or credentials.

Keep these boundaries:

- A draft is not authority to publish. The reader must review the final channel copy and use **Approve and schedule** once for that exact text and time.
- After approval, the deterministic scheduler may use the configured official API without a second prompt. Do not regenerate or edit the post at publish time.
- X, Bluesky, Threads, Facebook Pages and professional Instagram accounts may publish only when their official connector is configured locally. Instagram additionally needs a public article image.
- Reddit, Discord, YouTube Community, Facebook personal profiles and any unconfigured or unsupported route remain **Ready to post**. Copy/open helpers are allowed; do not claim they were posted until the reader records or verifies the public result.
- Write Reddit and Discord copy for the named community. Prefer a substantive build note, useful observation or genuine question over a generic link drop.
- Never automate a CAPTCHA, disguise automation, imitate human browsing to evade rules, or promise that a platform will not label an official API post.
- Credentials are resolved from DSH's credential provider for one operation. Never return, log, screenshot, commit or place them in the queue.
- Queue records live under the local DSH data directory. If DSH was closed past the safe window, return the item to **Review** instead of dumping missed posts online.
- If delivery became uncertain, stop. Ask the reader to check the channel before approving again; avoiding duplicates matters more than automatic retry.

Codex can help inspect a community composer or verify a live result when available, but deterministic official-API scheduling does not depend on Codex. DeepSeek may help draft copy only when the reader explicitly authorizes the public article text for that provider; never send local queue or account data.

