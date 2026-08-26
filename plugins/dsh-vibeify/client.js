window.__ModuleLoader__.load({
	id: "dsh-vibeify",
	factory: () => {
		const module = { exports: {} };
		const exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const WATCHED_TYPES = new Set([
			"approval/requested",
			"approval/resolved",
		]);
		const RECYCLE_MS = 20_000;
		const RETRY_MAX_MS = 10_000;
		const CONVERSATION_SETTINGS_NAMESPACE = "ui-conversation";
		const BUSY_ENTER_FIELD = "busyEnter";
		const BUSY_ENTER_BEHAVIORS = new Set(["queue", "steer"]);
		const LIVE_CONTROLS_ID = "dsh-codex-live-controls";
		const LIVE_CONTROLS_STYLE_ID = "dsh-codex-live-controls-style";
		const VIBE_STORAGE_KEY = "dsh-vibeify.theme";
		const VIBE_ROOT_ID = "dsh-vibeify-picker";
		const VIBE_STYLE_ID = "dsh-vibeify-picker-style";
		const VIBE_PRESETS = Object.freeze({
			system: { label: "System", colors: {} },
			ocean: {
				label: "Ocean",
				colors: {
					"--dsw-alias-brand-primary": "#1769e0",
					"--dsw-alias-state-business-primary": "#1769e0",
					"--dsw-alias-state-business-tertiary": "#e8f2ff",
					"--dsw-alias-button-primary-fill": "#1769e0",
					"--dsw-alias-button-primary-hover": "#0d56bd",
					"--dsw-alias-bg-base": "#f6faff",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#eef6ff",
					"--dsw-alias-label-primary": "#102a43",
					"--dsw-alias-label-secondary": "#486581",
					"--dsw-alias-label-tertiary": "#829ab1",
					"--dsw-alias-border-l1": "#cbdff5",
					"--dsw-alias-interactive-bg-hover": "#e4f0ff",
				},
			},
			broadcast: {
				label: "Broadcast",
				colors: {
					"--dsw-alias-brand-primary": "#b61924",
					"--dsw-alias-state-business-primary": "#b61924",
					"--dsw-alias-state-business-tertiary": "#f8e7e6",
					"--dsw-alias-button-primary-fill": "#b61924",
					"--dsw-alias-button-primary-hover": "#90121b",
					"--dsw-alias-bg-base": "#fffaf3",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#f8f0e5",
					"--dsw-alias-label-primary": "#261f1c",
					"--dsw-alias-label-secondary": "#665b55",
					"--dsw-alias-label-tertiary": "#8c817a",
					"--dsw-alias-border-l1": "#ded2c5",
					"--dsw-alias-interactive-bg-hover": "#f5e5dd",
				},
			},
			forest: {
				label: "Forest",
				colors: {
					"--dsw-alias-brand-primary": "#19704b",
					"--dsw-alias-state-business-primary": "#19704b",
					"--dsw-alias-state-business-tertiary": "#e2f3e9",
					"--dsw-alias-button-primary-fill": "#19704b",
					"--dsw-alias-button-primary-hover": "#11583a",
					"--dsw-alias-bg-base": "#f6faf4",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#edf5e9",
					"--dsw-alias-label-primary": "#18372b",
					"--dsw-alias-label-secondary": "#526b60",
					"--dsw-alias-label-tertiary": "#7b9187",
					"--dsw-alias-border-l1": "#cbdccf",
					"--dsw-alias-interactive-bg-hover": "#e5f0e3",
				},
			},
			synthwave: {
				label: "Synthwave",
				colors: {
					"--dsw-alias-brand-primary": "#37e6ff",
					"--dsw-alias-state-business-primary": "#37e6ff",
					"--dsw-alias-state-business-tertiary": "#33245e",
					"--dsw-alias-button-primary-fill": "#b94cff",

					"--dsw-alias-button-primary-hover": "#cd76ff",
					"--dsw-alias-bg-base": "#120d26",
					"--dsw-alias-bg-layer-1": "#1c1536",
					"--dsw-alias-bg-layer-2": "#261b49",
					"--dsw-alias-label-primary": "#fff7ff",
					"--dsw-alias-label-secondary": "#d7c9ef",
					"--dsw-alias-label-tertiary": "#a897c8",
					"--dsw-alias-border-l1": "#53417b",
					"--dsw-alias-interactive-bg-hover": "#33245e",
				},
			},
		});
		const VIBE_VARIABLES = [...new Set(
			Object.values(VIBE_PRESETS).flatMap((preset) => Object.keys(preset.colors)),
		)];

		function muxUrl() {
			const url = new URL("/api/events.mux", window.location.origin);
			url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
			return url;
		}

		function approvalEnvelope(raw) {
			if (typeof raw !== "string") return null;
			try {
				const envelope = JSON.parse(raw);
				if (
					envelope === null ||
					typeof envelope !== "object" ||
					typeof envelope.rpcId !== "string" ||
					envelope.payload === null ||
					typeof envelope.payload !== "object" ||
					!WATCHED_TYPES.has(envelope.payload.type)
				) return null;
				return {
					rpcId: envelope.rpcId,
					payload: envelope.payload,
				};
			} catch {
				return null;
			}
		}

		function apply(ctx) {
			const sessions = ctx.get("sessions");
			const conversationSettings = ctx.settingsScope.bind({
				namespace: CONVERSATION_SETTINGS_NAMESPACE,
			});

			ctx.effect(() => {
				let disposed = false;
				let socket = null;
				let recycleTimer = null;
				let retryTimer = null;
				let retryMs = 500;

				const clearTimers = () => {
					if (recycleTimer !== null) clearTimeout(recycleTimer);
					if (retryTimer !== null) clearTimeout(retryTimer);
					recycleTimer = null;
					retryTimer = null;
				};

				const closeSocket = () => {
					const current = socket;
					socket = null;
					if (
						current !== null &&
						(current.readyState === WebSocket.CONNECTING || current.readyState === WebSocket.OPEN)
					) current.close();
				};

				const scheduleRetry = () => {
					if (disposed || document.hidden || retryTimer !== null) return;
					retryTimer = setTimeout(() => {
						retryTimer = null;
						connect();
					}, retryMs);
					retryMs = Math.min(RETRY_MAX_MS, retryMs * 2);
				};

				const connect = () => {
					if (disposed || document.hidden || socket !== null) return;
					const candidate = new WebSocket(muxUrl());
					socket = candidate;

					candidate.addEventListener("open", () => {
						if (socket !== candidate) return;
						retryMs = 500;
						recycleTimer = setTimeout(() => {
							recycleTimer = null;
							if (socket === candidate) candidate.close();
						}, RECYCLE_MS);
					});

					candidate.addEventListener("message", (event) => {
						const envelope = approvalEnvelope(event.data);
						if (envelope !== null) sessions.handleMuxEnvelope(envelope);
					});

					candidate.addEventListener("close", () => {
						if (socket !== candidate) return;
						socket = null;
						if (recycleTimer !== null) clearTimeout(recycleTimer);
						recycleTimer = null;
						scheduleRetry();
					}, { once: true });
				};

				const reconnectNow = () => {
					if (disposed || document.hidden) return;
					clearTimers();
					closeSocket();
					connect();
				};

				const onVisibilityChange = () => {
					if (document.hidden) {
						clearTimers();
						closeSocket();
						return;
					}
					reconnectNow();
				};

				document.addEventListener("visibilitychange", onVisibilityChange);
				window.addEventListener("focus", reconnectNow);
				connect();

				return () => {
					disposed = true;
					document.removeEventListener("visibilitychange", onVisibilityChange);
					window.removeEventListener("focus", reconnectNow);
					clearTimers();
					closeSocket();
				};
			}, "codex-chatgpt: approval stream watchdog");

			ctx.effect(() => {
				let disposed = false;
				let frame = null;
				let preferredMode = "queue";

				const style = document.createElement("style");
				style.id = LIVE_CONTROLS_STYLE_ID;
				style.textContent = `
#${LIVE_CONTROLS_ID} {
  box-sizing: border-box;
  width: 100%;
  color: var(--dsw-alias-label-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 8px 7px;
  font: var(--dsw-font-xs-13);
}
#${LIVE_CONTROLS_ID}[hidden] { display: none; }
#${LIVE_CONTROLS_ID} .dsh-codex-live-copy {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
#${LIVE_CONTROLS_ID} .dsh-codex-live-title {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}
#${LIVE_CONTROLS_ID} .dsh-codex-live-hint {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
#${LIVE_CONTROLS_ID} .dsh-codex-live-modes {
  flex: none;
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 9px;
  background: var(--dsw-alias-bg-base);
}
#${LIVE_CONTROLS_ID} button {
  min-width: 58px;
  height: 26px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  border: 0;
  border-radius: 7px;
  background: transparent;
  padding: 0 9px;
  font: inherit;
}
#${LIVE_CONTROLS_ID} button:hover { background: var(--dsw-alias-interactive-bg-hover); }
#${LIVE_CONTROLS_ID} button[aria-pressed="true"] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-state-business-tertiary);
  font-weight: 500;
}
#${LIVE_CONTROLS_ID} button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}
@media (max-width: 720px) {
  #${LIVE_CONTROLS_ID} { align-items: flex-start; flex-direction: column; }
}
`;
				const previousStyle = document.getElementById(LIVE_CONTROLS_STYLE_ID);
				previousStyle?.remove();
				document.head.appendChild(style);

				const selectedChat = () => {
					const selected = document.querySelector('[role="tab"][aria-selected="true"]');
					return selected?.textContent?.trim() === "Chat";
				};

				const runningThink = () => {
					const running = [...document.querySelectorAll('[role="status"]')].some((status) =>
						status.textContent?.includes("Deep diving..."),
					);
					if (!running) return null;
					const rows = document.querySelectorAll('[data-variant="think"]');
					return rows.length === 0 ? null : rows[rows.length - 1];
				};

				const revealProgress = () => {
					if (!selectedChat()) return;
					const row = runningThink();
					if (!(row instanceof HTMLElement) || row.dataset.codexProgressOpened === "true") return;
					row.dataset.codexProgressOpened = "true";
					const toggle = row.querySelector('[role="button"][aria-expanded="false"], button[aria-expanded="false"]');
					if (toggle instanceof HTMLElement) toggle.click();
				};

				const modeFromSettings = () => {
					const value = conversationSettings.getSnapshot().value?.[BUSY_ENTER_FIELD];
					return BUSY_ENTER_BEHAVIORS.has(value) ? value : "queue";
				};

				const renderMode = (controls) => {
					for (const button of controls.querySelectorAll("button[data-mode]")) {
						button.setAttribute("aria-pressed", String(button.dataset.mode === preferredMode));
					}
				};

				const createControls = () => {
					const controls = document.createElement("div");
					controls.id = LIVE_CONTROLS_ID;
					controls.setAttribute("aria-label", "Choose how a message is sent while the agent is working");
					controls.innerHTML = `
<div class="dsh-codex-live-copy">
  <span class="dsh-codex-live-title">While Codex is working, Enter will:</span>
  <span class="dsh-codex-live-hint">Cmd/Ctrl+Enter uses the other choice</span>
</div>
<div class="dsh-codex-live-modes" role="group" aria-label="Running message behavior">
  <button type="button" data-mode="queue" title="Send after the current work finishes">Queue</button>
  <button type="button" data-mode="steer" title="Redirect the work in progress">Steer</button>
</div>`;
					controls.addEventListener("click", (event) => {
						const button = event.target instanceof Element ? event.target.closest("button[data-mode]") : null;
						const mode = button?.dataset.mode;
						if (!BUSY_ENTER_BEHAVIORS.has(mode)) return;
						preferredMode = mode;
						renderMode(controls);
						conversationSettings.set(BUSY_ENTER_FIELD, mode).catch(() => {
							preferredMode = modeFromSettings();
							renderMode(controls);
						});
					});
					renderMode(controls);
					return controls;
				};

				const renderControls = () => {
					const card = document.querySelector('[data-composer-seat] [data-composer-card]');
					if (!(card instanceof HTMLElement) || !(card.parentElement instanceof HTMLElement)) return;
					let controls = document.getElementById(LIVE_CONTROLS_ID);
					if (!(controls instanceof HTMLElement)) controls = createControls();
					if (controls.parentElement !== card.parentElement) card.parentElement.insertBefore(controls, card);
					controls.hidden = runningThink() === null;
					renderMode(controls);
				};

				const refresh = () => {
					frame = null;
					if (disposed) return;
					preferredMode = modeFromSettings();
					revealProgress();
					renderControls();
				};

				const scheduleRefresh = () => {
					if (disposed || frame !== null) return;
					frame = requestAnimationFrame(refresh);
				};

				const observer = new MutationObserver(scheduleRefresh);
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["aria-expanded", "aria-selected", "data-state"],
				});
				const unsubscribeSettings = conversationSettings.subscribe(scheduleRefresh);
				scheduleRefresh();

				return () => {
					disposed = true;
					observer.disconnect();
					unsubscribeSettings();
					if (frame !== null) cancelAnimationFrame(frame);
					document.getElementById(LIVE_CONTROLS_ID)?.remove();
					style.remove();
				};
			}, "codex-chatgpt: live progress and running-message controls");

			ctx.effect(() => {
				// DSH defines its design tokens on body, so inline body values reliably
				// override both the light and dark upstream palettes.
				const rootStyle = document.body.style;
				const originalValues = new Map(
					VIBE_VARIABLES.map((variable) => [variable, rootStyle.getPropertyValue(variable)]),
				);
				let selected = "system";

				try {
					const stored = window.localStorage.getItem(VIBE_STORAGE_KEY);
					if (stored in VIBE_PRESETS) selected = stored;
				} catch {
					// Storage can be disabled; the selector still works for this page load.
				}

				const restoreOriginals = () => {
					for (const [variable, original] of originalValues) {
						if (original === "") rootStyle.removeProperty(variable);
						else rootStyle.setProperty(variable, original);
					}
				};

				const applyVibe = (name) => {
					if (!(name in VIBE_PRESETS)) return;
					selected = name;
					restoreOriginals();
					for (const [variable, value] of Object.entries(VIBE_PRESETS[name].colors)) {
						rootStyle.setProperty(variable, value);
					}
					try {
						window.localStorage.setItem(VIBE_STORAGE_KEY, name);
					} catch {
						// Keep the selected VIBE for this page load when storage is unavailable.
					}
				};

				const style = document.createElement("style");
				style.id = VIBE_STYLE_ID;
				style.textContent = `
#${VIBE_ROOT_ID} {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 10000;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xs-13, 500 13px/1.3 system-ui, sans-serif);
}
#${VIBE_ROOT_ID} .dsh-vibeify-trigger {
  min-width: 58px;
  height: 34px;
  padding: 0 12px;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 5px 20px rgb(0 0 0 / 14%);
  font: inherit;
  font-weight: 700;
  letter-spacing: .04em;
}
#${VIBE_ROOT_ID} .dsh-vibeify-trigger:hover { background: var(--dsw-alias-interactive-bg-hover); }
#${VIBE_ROOT_ID} .dsh-vibeify-menu {
  position: absolute;
  right: 0;
  bottom: 42px;
  width: 184px;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 13px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 12px 32px rgb(0 0 0 / 20%);
}
#${VIBE_ROOT_ID} .dsh-vibeify-menu[hidden] { display: none; }
#${VIBE_ROOT_ID} .dsh-vibeify-heading {
  margin: 3px 8px 7px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
#${VIBE_ROOT_ID} .dsh-vibeify-choice {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  text-align: left;
}
#${VIBE_ROOT_ID} .dsh-vibeify-choice:hover { background: var(--dsw-alias-interactive-bg-hover); }
#${VIBE_ROOT_ID} .dsh-vibeify-choice[aria-checked="true"] {
  background: var(--dsw-alias-state-business-tertiary);
  font-weight: 600;
}
#${VIBE_ROOT_ID} .dsh-vibeify-swatch {
  width: 12px;
  height: 12px;
  flex: none;
  border: 1px solid rgb(0 0 0 / 16%);
  border-radius: 50%;
  background: var(--vibe-swatch);
}
#${VIBE_ROOT_ID} button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}
`;
				document.getElementById(VIBE_STYLE_ID)?.remove();
				document.head.appendChild(style);

				const picker = document.createElement("div");
				picker.id = VIBE_ROOT_ID;
				picker.innerHTML = `
<button class="dsh-vibeify-trigger" type="button" aria-haspopup="true" aria-expanded="false">VIBE</button>
<div class="dsh-vibeify-menu" role="radiogroup" aria-label="DSH visual VIBE" hidden>
  <div class="dsh-vibeify-heading">Choose a VIBE</div>
  <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="system"><span class="dsh-vibeify-swatch" style="--vibe-swatch: linear-gradient(135deg,#ffffff 50%,#242424 50%)"></span>System</button>
  <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="ocean"><span class="dsh-vibeify-swatch" style="--vibe-swatch:#1769e0"></span>Ocean</button>
  <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="broadcast"><span class="dsh-vibeify-swatch" style="--vibe-swatch:#b61924"></span>Broadcast</button>
  <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="forest"><span class="dsh-vibeify-swatch" style="--vibe-swatch:#19704b"></span>Forest</button>
  <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="synthwave"><span class="dsh-vibeify-swatch" style="--vibe-swatch:#b94cff"></span>Synthwave</button>
</div>`;

				const trigger = picker.querySelector(".dsh-vibeify-trigger");
				const menu = picker.querySelector(".dsh-vibeify-menu");
				const renderSelection = () => {
					for (const button of picker.querySelectorAll("[data-vibe]")) {
						button.setAttribute("aria-checked", String(button.dataset.vibe === selected));
					}
					trigger.title = `Visual VIBE: ${VIBE_PRESETS[selected].label}`;
				};
				const setOpen = (open) => {
					menu.hidden = !open;
					trigger.setAttribute("aria-expanded", String(open));
				};
				const onPickerClick = (event) => {
					const choice = event.target instanceof Element ? event.target.closest("[data-vibe]") : null;
					if (choice?.dataset.vibe in VIBE_PRESETS) {
						applyVibe(choice.dataset.vibe);
						renderSelection();
						setOpen(false);
						trigger.focus();
						return;
					}
					if (event.target instanceof Element && event.target.closest(".dsh-vibeify-trigger")) {
						setOpen(menu.hidden);
					}
				};
				const onDocumentClick = (event) => {
					if (!picker.contains(event.target)) setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key !== "Escape" || menu.hidden) return;
					setOpen(false);
					trigger.focus();
				};

				picker.addEventListener("click", onPickerClick);
				document.addEventListener("click", onDocumentClick);
				document.addEventListener("keydown", onKeyDown);
				document.body.appendChild(picker);
				applyVibe(selected);
				renderSelection();

				return () => {
					picker.removeEventListener("click", onPickerClick);
					document.removeEventListener("click", onDocumentClick);
					document.removeEventListener("keydown", onKeyDown);
					picker.remove();
					style.remove();
					restoreOriginals();
				};
			}, "dsh-vibeify: local visual theme selector");
		}

		exports.apply = apply;
		exports.inject = ["sessions", "settingsScope"];
		return module.exports;
	},
});
