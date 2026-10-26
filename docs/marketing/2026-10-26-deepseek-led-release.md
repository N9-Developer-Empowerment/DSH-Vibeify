# Vibeify 0.17.0 — DeepSeek leads, OpenAI supports

Announcement copy for the 0.17.0 project release and website. Other channel variants are prepared for a separately selected destination.

## Main announcement

DSH Vibeify 0.17.0 adds a new way to work with the models you already use.

**DeepSeek V4.1 Flash 1017 leads. GPT-6.1 Sol is available for bounded support through your ChatGPT sign-in.** DeepSeek stays in charge of the request, reviews the worker's evidence, and gives the final answer.

The original Standard preset is still there. Choose DeepSeek only, ChatGPT only with Codex leading, or both with DeepSeek leading and OpenAI support. DeepSeek API usage and ChatGPT plan usage remain separate.

The optional Codex worker runs as a one-shot task in a workspace-write sandbox with automatic permission review. Protected connected-app requests and requests for human input fail closed and return to the lead's normal confirmation route. The two-worker limit is prompt guidance, not a hard technical cap.

The compatibility bundle is DeepSeek Harness 0.2.1-rc.2, Codex 0.164.0, and Vibeify 0.17.0. The Windows and Linux installers remain preview until real-machine qualification.

Release: https://github.com/N9-Developer-Empowerment/DSH-Vibeify/releases/tag/v0.17.0

Project: https://dsh-vibeify.ezzye.chatgpt.site/

DeepSeek's official V4.1 Flash release note: https://api-docs.deepseek.com/news/news261017/

## Short social version

Vibeify 0.17.0: DeepSeek leads, OpenAI supports.

DeepSeek V4.1 Flash 1017 stays in charge. When useful, the lead can ask GPT-6.1 Sol for a bounded task through your ChatGPT sign-in, then review the evidence itself. The original Standard preset remains available.

DeepSeek API and ChatGPT plan usage are separate. No claim of identical quality or lower total cost for every task.

Release details: https://github.com/N9-Developer-Empowerment/DSH-Vibeify/releases/tag/v0.17.0

## DSH plugin-builder update

Vibeify 0.17.0 introduces `dsh-vibeify-deepseek`, a separate DSH bundle that selects a DeepSeek-led Vibeify preset and registers the native `@deepseek-ai/dsh-subagent-codex` worker at `gpt-6.1-sol`. The worker is one-shot; its final text returns as evidence for the DeepSeek parent. Its permission mode is `approve-for-me`, with workspace-write sandboxing and Codex automatic review. Human-input and protected connected-app requests fail closed. The deployment's two-worker policy is prompt guidance rather than a technical cap.

The original Standard preset remains available, and the Codex-led package remains a separate choice. The compatibility tuple is DSH `0.2.1-rc.2`, Codex `0.164.0`, and Vibeify `0.17.0`.

Official references: [DeepSeek release](https://api-docs.deepseek.com/news/news261017/), [pricing](https://api-docs.deepseek.com/quick_start/pricing/), [Codex app-server schema](https://learn.chatgpt.com/docs/app-server#message-schema).

## YouTube community update

Vibeify's new setup keeps DeepSeek in the lead while making GPT-6.1 Sol available for bounded help through ChatGPT sign-in. The DeepSeek lead reviews the worker's evidence and owns the final answer. The familiar Standard preset stays available, and the two provider routes use separate account usage.

See the Vibeify walkthrough: https://youtu.be/jda4uplWsiI

Release information: https://github.com/N9-Developer-Empowerment/DSH-Vibeify/releases/tag/v0.17.0
