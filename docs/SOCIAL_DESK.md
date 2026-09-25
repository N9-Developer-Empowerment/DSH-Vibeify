# Vibe Social Desk

Vibe Social Desk is an optional DSH companion for people who have something worth sharing but do not want to spend the day copying the same article between websites.

It adds two routes:

1. Choose **Prepare social posts** on a finished Vibe card.
2. Open **Social Desk** at the top of Vibe to review the local queue.

The desk makes different starting copy for each selected channel. The reader can edit every word. A draft has no publishing authority.

## The default route needs no account connection

Every supported channel starts with the same simple route:

1. Review the channel-specific wording and choose a time.
2. Choose **Approve and schedule** for that exact copy and time.
3. While DSH is open, the local scheduler marks the item **Ready to post** when its time arrives. The Social Desk button shows how many posts are waiting.
4. Choose **Copy and open**. Vibeify copies the reviewed wording and opens the normal social composer. X, Bluesky and Threads can receive prefilled text; Facebook and Reddit receive the public article link and title where their share screens support it; Instagram, Discord and YouTube open at their normal posting surface.
5. Check the real composer and make its final public **Post** click yourself. Afterwards, record the item as posted in Social Desk.

No developer account, API key, access token, account identifier or browser automation is needed. Some sites deliberately limit what a share link can prefill, so the clipboard is the reliable hand-off and the open composer remains the source of truth. Vibeify never solves a CAPTCHA, enters a password, imitates human activity or claims a post succeeded merely because a tab opened.

This is local scheduling, not a cloud service. DSH and the computer must be awake for the ready badge to appear at the selected time. A long-missed item returns to review instead of posting unexpectedly after a restart.

## Optional automatic publishing

People who deliberately want unattended posting may enable an official connector under **Settings → Vibe Social Desk**. This is an advanced alternative, not an installation requirement. The supported optional connectors are:

- X using an official user-context access token;
- Bluesky using a handle and app password;
- Threads using the official Threads API;
- a Facebook Page using the official Graph API; and
- a professional Instagram account using the official Graph API and a public article image.

Each connector is off by default. When one is explicitly enabled and completely configured, newly prepared drafts for that channel use its official API. The same **Approve and schedule** action then authorizes one later deterministic request containing only the exact reviewed copy and time. No model runs or rewrites the post at publishing time.

The repository contains no username, account id, email address, token or app password. Credentials are write-only DSH credential references: the host resolves one for an approved due operation and never returns it through the browser queue. Turning an optional connector off returns future drafts to the ordinary composer route.

## Meta setup for optional automatic publishing

Ordinary use should stay on the no-API route above. The following setup is needed only by an owner who chooses Meta's unattended API route. Computer Use can guide the screens, but the account owner must personally confirm developer terms, app creation, account conversion or linking, requested permissions and any final public post.

### What must already exist

- **Threads:** a Threads profile. A public profile permits a long-lived permission grant to be refreshed; a private profile must grant access again after expiry.
- **Facebook Page:** a Page—not a personal Facebook profile—and a Facebook account allowed to create content, manage and moderate that Page.
- **Instagram:** a Business or Creator account. For Vibeify's Facebook Login route, connect it to the Facebook Page. The Page may also require Meta's Page Publishing Authorization.

Do not convert an Instagram account, create a Page or link accounts merely to make a badge turn green. Those are account-level changes and should be deliberate.

### One Meta developer app

1. Register at [Meta for Developers](https://developers.facebook.com/async/registration/), read the current platform terms, and complete Meta's account verification.
2. Create a Meta app for the organisation that will operate Social Desk.
3. Add the **Threads use case**. Meta gives the Threads integration its own app ID and app secret; use that pair for Threads.
4. Add Facebook Login for Business and the Pages/Instagram products needed by the Page and professional Instagram account.
5. Keep the app in development while only its owner, developers or invited testers are using it. Threads testers must accept their invitation. App Review and a published app are required before people without an app role can grant these permissions.

Creating the developer account or app, accepting platform terms, generating a persistent token and switching an app live are protected external actions. Stop at the final confirmation screen unless the account owner has approved that exact action.

### Minimum publishing permissions

| Channel | Account identifier | Credential stored in DSH | Publishing permissions used by this connector |
| --- | --- | --- | --- |
| Threads | Threads API user ID | Threads user access token | `threads_basic`, `threads_content_publish` |
| Facebook Page | Page ID | Page access token | `pages_manage_posts`, `pages_read_engagement`; Meta's current Page guide also lists `pages_manage_engagement` and `pages_read_user_engagement` for its complete post-management flow |
| Instagram professional | Instagram professional account ID | Facebook Page access token | `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` |

Instagram's newer Instagram Login route uses `instagram_business_basic` and `instagram_business_content_publish` on `graph.instagram.com`. Vibeify currently uses the Facebook Login/Page-token route on `graph.facebook.com`; do not mix the two token families.

Threads short-lived tokens last about one hour. Meta documents an exchange to a 60-day long-lived token and a refresh route before expiry. Treat every token like a password even when Meta calls it long-lived.

### Put the connection into DSH

Open **Settings → Vibe Social Desk** and work on one channel at a time:

1. Enter the numeric account or Page ID.
2. Keep the suggested uppercase credential reference unless there is a clear reason to use another name.
3. Paste the newly issued token into **New access token or app password** and choose **Save credential**. The password field clears because DSH never reads the stored secret back into the page.
4. Enable **Use official API**, choose **Save social settings**, then **Refresh connection status**.

The token belongs only in DSH's write-only credential store. Never put it in a repository, shell command, issue, screenshot, article, support report or online chat. **Credential stored** proves only that a secret exists. **Connected** proves that the switch, identifier and secret reference are present. Neither status proves that Meta will accept a post; the safe verification is a read-only account lookup followed later by one separately approved real post.

Instagram also needs the Vibe article's first public image to be an HTTPS JPEG that Meta can fetch without a login. The preview can look correct while Meta still cannot download the image, so verify the public image URL before approval.

Official references: [Threads get started](https://developers.facebook.com/documentation/threads/get-started), [Facebook Page posts](https://developers.facebook.com/documentation/pages-api/posts), and [Instagram content publishing](https://developers.facebook.com/documentation/instagram-platform/content-publishing).

### Common connection problems

- **Meta says the verification session expired or is invalid:** reload the registration page before entering the mobile number again. Request a new SMS and use only its new code; an earlier code belongs to the expired session. If it repeats, close duplicate registration tabs and reopen [Meta developer registration](https://developers.facebook.com/async/registration/) once.
- **Meta says the change cannot be made from an unfamiliar device:** this is an account-security hold, not a rejected email or verification code. Stop retrying. Complete registration from the browser or mobile device normally used for that Facebook account, preferably without private browsing, a VPN or a changed network. If Meta still blocks it, use that trusted device normally and return later; there is no safe Vibeify or Computer Use bypass. Never weaken two-factor authentication or add a payment card merely to work around the hold.
- **Threads stays disconnected:** accept the Threads tester invitation, request both publishing permissions, use the Threads-specific app ID/secret, and store a Threads user token rather than a Facebook token.
- **Facebook Page is rejected:** check the Page ID, Page access token and that the signed-in person has the `CREATE_CONTENT`, `MANAGE` and `MODERATE` Page tasks.
- **Instagram is rejected:** confirm Business/Creator status, Page connection, Page Publishing Authorization if required, the professional account ID, and a Facebook Page token with the Instagram permissions above.
- **Instagram says the image is unavailable:** publish a JPEG at a direct public HTTPS URL; HTML pages, private previews and login-protected image URLs do not qualify.
- **It worked and then stopped:** the access grant or token may have expired or been revoked. Replace it in the write-only field; do not paste it into a diagnostic report.
- **A badge says Connected but posting fails:** configuration presence is not live API proof. Keep the item in review, inspect the bounded error, and never repeatedly approve an uncertain delivery.

## Ready to post means ready—not secretly posted

All channels use **Ready to post** unless that specific channel has an explicitly enabled official connector. Social Desk prepares useful channel-specific copy, puts it on the clipboard and opens the relevant website. It does not automate a personal browser session, solve a CAPTCHA, imitate human activity, hide an official integration, or claim a manual item was posted before the reader records or verifies it.

For Reddit and Discord, the draft is deliberately more than a generic link drop. It offers a useful observation, build note or genuine question suitable for a named community. The reader remains responsible for its rules and context.

## Local queue and restart behaviour

The queue is stored at `DSH_HOME/vibe-social-desk/queue.json` (normally inside the local `.dsh` directory) with owner-only file permissions. It contains the cleaned public title, bounded excerpt, selected public link/image, final channel copy, schedule, status and a non-secret approval receipt. It does not contain prompts, Chat history, reasoning, attachments, unrelated cards or credentials.

Statuses are plain:

- **Review draft** — edit it; nothing may publish.
- **Scheduled** — exact approved copy is waiting for its time.
- **Posting** — one optional official-API request is in flight.
- **Posted** — a remote receipt was recorded.
- **Retry queued** — a bounded retry is waiting after a definite failure.
- **Ready to post** — the scheduled hand-off is due; copy it, open the composer and make the final public click.
- **Review again** — a schedule was missed too long, or delivery became uncertain.

DSH checks due schedules every 30 seconds while it is open. Composer items become **Ready to post** without making an external request; optional official items make their single approved request. DSH does not pretend to be a cloud service when the computer is asleep. A post missed by more than the configured safe window returns to **Review again**. If DSH stopped while an official request was in flight, Social Desk asks the reader to check the channel before approving again; avoiding a duplicate matters more than automatic recovery.

## Provider and Codex boundary

The deterministic queue, composer hand-off and optional official connectors do not require Codex. DeepSeek or Codex may help draft public copy only when the reader explicitly asks and permits that provider to receive the public article text. Neither provider receives social credentials or the local queue.

Codex can help open a manual composer or verify a live public result when its browser capability is available. That does not turn a manual route into an API connector and does not remove the reader's review.
