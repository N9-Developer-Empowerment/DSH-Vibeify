# Architecture

DSH Vibeify has three deliberately separate faces.

| Face | Runs where | Responsibility |
| --- | --- | --- |
| DSH host bundle | DSH Node process | Registers the ChatGPT-authenticated Codex adapter, access policy, model routing, image handling, connected-app support, and bounded DSH delegation tool. |
| DSH browser client | DSH Web UI | Keeps approvals live, expands progress, adds Queue/Steer controls, and applies the selected VIBE. |
| Codex plugin skill | Codex | Teaches a Codex agent how to install, diagnose, update, and operate the DSH bundle safely. It does not itself run the DSH bridge. |

## Lead and worker flow

```text
User
  └─ DSH Web UI
      └─ Vibeify Codex adapter (ChatGPT authentication)
          ├─ local tools, web, and installed Codex apps
          ├─ native Codex subagents
          └─ optional bounded DSH worker call
              └─ DeepSeek route selected from the live DSH catalogue
```

Codex owns the parent turn throughout. The DeepSeek result returns as evidence to Codex; it is never accepted automatically and never becomes the lead response.

## Configuration boundaries

- `plugins/dsh-vibeify/cordis.patch.yml` registers the bundle's host row and default provider.
- `plugins/dsh-vibeify/package.json` declares both the DSH bundle patch and browser client entry.
- `~/.dsh/settings.yaml` owns user-selected Codex model/reasoning values and DSH permissions.
- `model-routing-policy.json` owns dated worker capabilities, price assumptions, and the quality-first invariant.
- Codex's own authentication and connected-app configuration remain under Codex; Vibeify does not copy credentials.
- VIBE selection stays in browser local storage and affects presentation only.

## Why a bundle

The earlier installation was a plain dependency plus a handwritten profile patch. A DSH bundle declares `dsh.bundle.patch`, so `dsh plugin --profile <name> add ...` can add the package and its configuration layer together. Profile-local and home-local patch layers remain later overrides, preserving normal DSH composition.

## Portability boundary

Connected apps surfaced by the Codex app-server are available to the lead. Desktop-only capabilities such as an interactive Chrome or Computer Use session may also require the appropriate Codex desktop host connection; permission configuration alone cannot manufacture that host session.

The browser client and its VIBEs do not depend on Codex-specific model logic. A future lead-agent adapter can reuse that UI layer, but the current host bundle registers only the tested `codex-chatgpt` provider. Supporting another lead requires a separate authenticated adapter, capability checks, and equivalent acceptance tests.
