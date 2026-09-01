window.__ModuleLoader__.load({
	id: "dsh-vibeify",
	factory: (require) => {
		const module = { exports: {} };
		const exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const CODEX_FEATURES_ENABLED = __DSH_VIBEIFY_CODEX_FEATURES__;

		const WATCHED_TYPES = new Set([
			"approval/requested",
			"approval/resolved",
		]);
		const RECYCLE_MS = 20_000;
		const RETRY_MAX_MS = 10_000;
		const CONVERSATION_SETTINGS_NAMESPACE = "ui-conversation";
		const BUSY_ENTER_FIELD = "busyEnter";
		const BUSY_ENTER_BEHAVIORS = new Set(["queue", "steer"]);
		const CODEX_SETTINGS_NAMESPACE = "llm-codex-chatgpt";
		const CODEX_CAPABILITY_STYLE_ID = "dsh-vibeify-codex-capability-style";
		const UPDATE_STYLE_ID = "dsh-vibeify-update-style";
		const UPDATE_RPC_CHANNEL = "/vibeify-updates";
		const VISUAL_SETTINGS_NAMESPACE = "dsh-visuals";
		const VISUAL_SETTINGS_STYLE_ID = "dsh-vibeify-visual-settings-style";
		const SOCIAL_DESK_SETTINGS_NAMESPACE = "dsh-social-desk";
		const SOCIAL_DESK_SETTINGS_STYLE_ID = "dsh-vibeify-social-settings-style";
		const SOCIAL_DESK_RPC_CHANNEL = "/dsh-social-desk";
		const SOCIAL_DESK_ACCOUNTS = Object.freeze([
			Object.freeze({ id: "x", label: "X", enabled: "xEnabled", account: "xUsername", accountLabel: "X username", placeholder: "@username", credential: "xTokenRef", credentialDefault: "X_USER_ACCESS_TOKEN" }),
			Object.freeze({ id: "bluesky", label: "Bluesky", enabled: "blueskyEnabled", account: "blueskyHandle", accountLabel: "Bluesky handle", placeholder: "name.bsky.social", credential: "blueskyAppPasswordRef", credentialDefault: "BLUESKY_APP_PASSWORD" }),
			Object.freeze({ id: "threads", label: "Threads", enabled: "threadsEnabled", account: "threadsUserId", accountLabel: "Threads user ID", placeholder: "Numeric API user ID", credential: "threadsTokenRef", credentialDefault: "THREADS_ACCESS_TOKEN" }),
			Object.freeze({ id: "facebook-page", label: "Facebook Page", enabled: "facebookPageEnabled", account: "facebookPagePageId", accountLabel: "Facebook Page ID", placeholder: "Numeric Page ID", credential: "facebookPageTokenRef", credentialDefault: "FACEBOOK_PAGE_ACCESS_TOKEN" }),
			Object.freeze({ id: "instagram", label: "Instagram professional", enabled: "instagramEnabled", account: "instagramUserId", accountLabel: "Instagram professional user ID", placeholder: "Numeric API user ID", credential: "instagramTokenRef", credentialDefault: "INSTAGRAM_ACCESS_TOKEN" }),
		]);
		const VISUAL_CREDENTIALS = Object.freeze({
			pexels: Object.freeze({ ref: "PEXELS_API_KEY", label: "Pexels", href: "https://www.pexels.com/api/" }),
			pixabay: Object.freeze({ ref: "PIXABAY_API_KEY", label: "Pixabay", href: "https://pixabay.com/api/docs/" }),
		});
		const CODEX_CAPABILITY_OPTIONS = Object.freeze([
			{
				id: "efficient",
				label: "Efficient",
				model: "GPT-5.6 Luna · High",
				description: "A lighter Codex governor for routine, highly checkable work.",
			},
			{
				id: "balanced",
				label: "Balanced",
				model: "GPT-5.6 Terra · High",
				description: "Strong planning and verification with a lighter lead model.",
			},
			{
				id: "frontier",
				label: "Frontier",
				model: "GPT-5.6 Sol · Extra High",
				description: "Recommended SOTA lead for planning, judgment, integration, and verification.",
				recommended: true,
			},
			{
				id: "maximum",
				label: "Maximum",
				model: "GPT-5.6 Sol · Max",
				description: "Maximum supported reasoning for the hardest quality-first work.",
			},
		]);
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
		const EDITORIAL_PRESETS = __DshVibeifyExperience.EDITORIAL_PRESETS;
		const EDITORIAL_TRIBES = __DshVibeifyExperience.EDITORIAL_TRIBES;
		const EDITORIAL_SETTINGS_EVENT = __DshVibeifyExperience.EDITORIAL_SETTINGS_EVENT;

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

		function inferredCapability(value) {
			if (CODEX_CAPABILITY_OPTIONS.some(({ id }) => id === value?.capabilityLevel)) {
				return value.capabilityLevel;
			}
			if (value?.capabilityLevel === "custom") return "custom";
			if (value?.model === "gpt-5.6-sol" && value?.reasoningEffort === "xhigh") return "frontier";
			if (value?.model === "gpt-5.6-terra" && value?.reasoningEffort === "high") return "balanced";
			if (value?.model === "gpt-5.6-luna" && value?.reasoningEffort === "high") return "efficient";
			if (value?.model === "gpt-5.6-sol" && value?.reasoningEffort === "max") return "maximum";
			return "custom";
		}

		function capabilitySection(settings) {
			return function CodexCapabilitySection() {
				const snapshot = React.useSyncExternalStore(
					(listener) => settings.subscribe(listener),
					() => settings.getSnapshot(),
				);
				const selected = inferredCapability(snapshot.value);
				const [pending, setPending] = React.useState(null);
				const [error, setError] = React.useState("");
				const choose = async (capabilityLevel) => {
					setPending(capabilityLevel);
					setError("");
					try {
						await settings.set("capabilityLevel", capabilityLevel);
					} catch {
						setError("The capability setting could not be saved. Your previous setting is unchanged.");
					} finally {
						setPending(null);
					}
				};
				return React.createElement("section", { className: "dsh-vibeify-capability" },
					React.createElement("div", { className: "dsh-vibeify-capability-intro" },
						React.createElement("p", { className: "dsh-vibeify-capability-kicker" }, "CODEX LEAD"),
						React.createElement("h2", null, "Capability level"),
						React.createElement("p", null, "Codex always plans, manages, verifies, integrates, and answers. This setting changes the Codex model and reasoning used for that lead role; DeepSeek still performs eligible execution work."),
					),
					React.createElement("div", { className: "dsh-vibeify-capability-grid" },
						...CODEX_CAPABILITY_OPTIONS.map((option) => React.createElement("button", {
							key: option.id,
							type: "button",
							className: "dsh-vibeify-capability-card",
							"aria-pressed": String(selected === option.id),
							disabled: pending !== null,
							onClick: () => choose(option.id),
						},
						React.createElement("span", { className: "dsh-vibeify-capability-title" },
							option.label,
							option.recommended ? React.createElement("span", { className: "dsh-vibeify-capability-badge" }, "Recommended") : null,
						),
						React.createElement("span", { className: "dsh-vibeify-capability-model" }, option.model),
						React.createElement("span", { className: "dsh-vibeify-capability-description" }, option.description),
						)),
					),
					selected === "custom" ? React.createElement("p", { className: "dsh-vibeify-capability-note" }, "Custom model/reasoning values are active. Choose a preset here to manage them as one capability level.") : null,
					error.length > 0 ? React.createElement("p", { role: "alert", className: "dsh-vibeify-capability-error" }, error) : null,
					React.createElement("p", { className: "dsh-vibeify-capability-note" }, "Frontier is the quality-preserving default. Lower levels are optional trade-offs and should be evaluated on your own work. Changes apply to subsequent Codex turns."),
				);
			};
		}

		function visualSourcesSection(settings, api) {
			return function VisualSourcesSection() {
				const snapshot = React.useSyncExternalStore(
					(listener) => settings.subscribe(listener),
					() => settings.getSnapshot(),
				);
				const [drafts, setDrafts] = React.useState({ pexels: "", pixabay: "" });
				const [status, setStatus] = React.useState({ pexels: null, pixabay: null });
				const [pending, setPending] = React.useState(null);
				const [message, setMessage] = React.useState("");
				const referenceFor = React.useCallback((provider) => {
					const field = provider === "pexels" ? "pexelsApiKeyEnv" : "pixabayApiKeyEnv";
					const value = snapshot.value?.[field];
					return typeof value === "string" && value.length > 0 ? value : VISUAL_CREDENTIALS[provider].ref;
				}, [snapshot.value]);
				const refresh = React.useCallback(async () => {
					if (snapshot.status !== "ready") return;
					const refs = [referenceFor("pexels"), referenceFor("pixabay")];
					try {
						const response = await api.credentials.describe({ refs });
						if (!response.result.ok) return;
						setStatus({
							pexels: response.result.value.credentials[refs[0]] ?? { configured: false, writable: true },
							pixabay: response.result.value.credentials[refs[1]] ?? { configured: false, writable: true },
						});
					} catch {
						setMessage("Image-source status could not be read. No key was changed.");
					}
				}, [api, referenceFor, snapshot.status]);
				React.useEffect(() => { refresh(); }, [refresh]);
				const save = async (provider) => {
					const value = drafts[provider].trim();
					if (value.length === 0) return;
					setPending(provider);
					setMessage("");
					try {
						const response = await api.credentials.set({ ref: referenceFor(provider), value });
						if (response?.result?.ok !== true) throw new Error("credential write rejected");
						setDrafts((current) => ({ ...current, [provider]: "" }));
						setMessage(`${VISUAL_CREDENTIALS[provider].label} key saved securely.`);
						await refresh();
					} catch {
						setMessage(`${VISUAL_CREDENTIALS[provider].label} key was not saved. The earlier value is unchanged.`);
					} finally {
						setPending(null);
					}
				};
				const remove = async (provider) => {
					setPending(provider);
					setMessage("");
					try {
						const response = await api.credentials.unset({ ref: referenceFor(provider) });
						if (response?.result?.ok !== true) throw new Error("credential removal rejected");
						setMessage(`${VISUAL_CREDENTIALS[provider].label} key removed.`);
						await refresh();
					} catch {
						setMessage(`${VISUAL_CREDENTIALS[provider].label} key could not be removed.`);
					} finally {
						setPending(null);
					}
				};
				if (snapshot.status !== "ready") {
					return React.createElement("section", { className: "dsh-vibeify-visual-settings" },
						React.createElement("p", { className: "dsh-vibeify-visual-kicker" }, "OPTIONAL VISUAL SOURCES"),
						React.createElement("h2", null, "Better article images"),
						React.createElement("p", null, "The DSH Visuals plugin is not active. VIBE is still using its unique local cover and existing verified-image method."),
					);
				}
				const providerRow = (provider) => {
					const spec = VISUAL_CREDENTIALS[provider];
					const view = status[provider];
					const configured = view?.configured === true;
					const writable = view?.writable !== false;
					return React.createElement("div", { className: "dsh-vibeify-visual-provider", key: provider },
						React.createElement("div", { className: "dsh-vibeify-visual-provider-heading" },
							React.createElement("div", null,
								React.createElement("h3", null, spec.label),
								React.createElement("a", { href: spec.href, target: "_blank", rel: "noreferrer" }, "Get a free API key"),
							),
							React.createElement("span", { className: configured ? "is-configured" : "" }, configured ? "Configured" : "Not configured"),
						),
						React.createElement("label", null,
							React.createElement("span", null, `${spec.label} API key`),
							React.createElement("input", {
								type: "password",
								value: drafts[provider],
								autoComplete: "off",
								spellCheck: "false",
								disabled: pending !== null || !writable,
								placeholder: configured ? "Enter a replacement key" : "Paste key",
								onChange: (event) => setDrafts((current) => ({ ...current, [provider]: event.target.value })),
							}),
						),
						React.createElement("div", { className: "dsh-vibeify-visual-actions" },
							React.createElement("button", { type: "button", disabled: pending !== null || drafts[provider].trim().length === 0 || !writable, onClick: () => save(provider) }, pending === provider ? "Saving…" : "Save key"),
							configured ? React.createElement("button", { type: "button", className: "is-secondary", disabled: pending !== null || !writable, onClick: () => remove(provider) }, "Remove key") : null,
						),
					);
				};
				return React.createElement("section", { className: "dsh-vibeify-visual-settings" },
					React.createElement("div", { className: "dsh-vibeify-visual-intro" },
						React.createElement("p", { className: "dsh-vibeify-visual-kicker" }, "OPTIONAL VISUAL SOURCES"),
						React.createElement("h2", null, "Better article images"),
						React.createElement("p", null, "Wikimedia Commons and Openverse work without a key. Pexels and Pixabay widen the choice. Only an explicit magazine page title is sent as a public image-search phrase; ordinary Chat answers and article bodies stay local."),
					),
					React.createElement("div", { className: "dsh-vibeify-visual-free" },
						React.createElement("span", null, "Ready without keys"),
						React.createElement("strong", null, "Wikimedia Commons · Openverse"),
					),
					React.createElement("div", { className: "dsh-vibeify-visual-grid" }, providerRow("pexels"), providerRow("pixabay")),
					message.length > 0 ? React.createElement("p", { className: "dsh-vibeify-visual-message", role: "status" }, message) : null,
					React.createElement("p", { className: "dsh-vibeify-visual-note" }, "Keys are write-only: this page never reads them back, and shared Vibes never contain them. A blank field keeps the current key."),
				);
			};
		}

		function socialDeskSettingsSection(settings, api, connection) {
			return function SocialDeskSettingsSection() {
				const snapshot = React.useSyncExternalStore(
					(listener) => settings.subscribe(listener),
					() => settings.getSnapshot(),
				);
				const [drafts, setDrafts] = React.useState({});
				const [secretDrafts, setSecretDrafts] = React.useState({});
				const [credentialStatus, setCredentialStatus] = React.useState({});
				const [channelStatus, setChannelStatus] = React.useState({});
				const [pending, setPending] = React.useState(false);
				const [secretPending, setSecretPending] = React.useState(null);
				const [message, setMessage] = React.useState("");
				const revision = snapshot.revision;

				React.useEffect(() => {
					if (snapshot.status !== "ready") return;
					const value = snapshot.value ?? {};
					setDrafts(Object.fromEntries(SOCIAL_DESK_ACCOUNTS.flatMap((account) => [
						[account.enabled, value[account.enabled] === true],
						[account.account, typeof value[account.account] === "string" ? value[account.account] : ""],
						[account.credential, typeof value[account.credential] === "string" && value[account.credential].length > 0 ? value[account.credential] : account.credentialDefault],
					])));
				}, [revision, snapshot.status]);

				const refresh = React.useCallback(async () => {
					if (snapshot.status !== "ready") return;
					const value = snapshot.value ?? {};
					const refs = SOCIAL_DESK_ACCOUNTS.map((account) => {
						const configured = value[account.credential];
						return typeof configured === "string" && configured.length > 0 ? configured : account.credentialDefault;
					});
					try {
						const [credentialResponse, capabilityResponse] = await Promise.all([
							api.credentials.describe({ refs }),
							connection.rpc.call(SOCIAL_DESK_RPC_CHANNEL, "capabilities", {}),
						]);
						if (credentialResponse?.result?.ok === true) setCredentialStatus(credentialResponse.result.value.credentials ?? {});
						if (capabilityResponse?.ok === true) setChannelStatus(Object.fromEntries((capabilityResponse.value?.channels ?? []).map((channel) => [channel.id, channel])));
					} catch {
						setMessage("Connection status could not be refreshed. No account setting was changed.");
					}
				}, [api, connection, revision, snapshot.status]);

				React.useEffect(() => { refresh(); }, [refresh]);

				const save = async () => {
					const invalid = SOCIAL_DESK_ACCOUNTS.find((account) => !/^[A-Z_][A-Z0-9_]*$/.test(String(drafts[account.credential] ?? "")));
					if (invalid !== undefined) {
						setMessage(`${invalid.label} needs an uppercase credential reference such as ${invalid.credentialDefault}.`);
						return;
					}
					setPending(true);
					setMessage("");
					try {
						const saveField = (field, value) => settings.set(field, value);
						for (const account of SOCIAL_DESK_ACCOUNTS) {
							await saveField(account.enabled, drafts[account.enabled] === true);
							await saveField(account.account, String(drafts[account.account] ?? "").trim());
							await saveField(account.credential, String(drafts[account.credential] ?? account.credentialDefault).trim());
						}
						setMessage("Social account identifiers and credential references saved locally.");
						void refresh();
					} catch {
						setMessage("The Social Desk settings could not be saved. Review the fields and try again.");
					} finally {
						setPending(false);
					}
				};

				const saveSecret = async (account) => {
					const ref = String(drafts[account.credential] ?? account.credentialDefault).trim();
					const value = String(secretDrafts[account.id] ?? "").trim();
					if (!/^[A-Z_][A-Z0-9_]*$/.test(ref) || value.length === 0) return;
					setSecretPending(account.id);
					setMessage("");
					try {
						const response = await api.credentials.set({ ref, value });
						if (response?.result?.ok !== true) throw new Error("secret write rejected");
						setSecretDrafts((current) => ({ ...current, [account.id]: "" }));
						setMessage(`${account.label} credential saved securely.`);
						await refresh();
					} catch {
						setMessage(`${account.label} credential was not saved. The earlier value is unchanged.`);
					} finally {
						setSecretPending(null);
					}
				};

				const removeSecret = async (account) => {
					const ref = String(drafts[account.credential] ?? account.credentialDefault).trim();
					if (!/^[A-Z_][A-Z0-9_]*$/.test(ref)) return;
					setSecretPending(account.id);
					setMessage("");
					try {
						const response = await api.credentials.unset({ ref });
						if (response?.result?.ok !== true) throw new Error("secret removal rejected");
						setMessage(`${account.label} credential removed.`);
						await refresh();
					} catch {
						setMessage(`${account.label} credential could not be removed.`);
					} finally {
						setSecretPending(null);
					}
				};

				if (snapshot.status !== "ready") {
					return React.createElement("section", { className: "dsh-vibeify-social-settings" },
						React.createElement("p", { className: "dsh-vibeify-social-kicker" }, "VIBE SOCIAL DESK"),
						React.createElement("h2", null, "Optional automatic posting"),
						React.createElement("p", null, "The Social Desk settings are not available in this DSH session."),
					);
				}

				const accountCard = (account) => {
					const ref = String(drafts[account.credential] ?? account.credentialDefault);
					const stored = credentialStatus[ref]?.configured === true;
					const writable = credentialStatus[ref]?.writable !== false;
					const connected = channelStatus[account.id]?.configured === true;
					return React.createElement("article", { className: "dsh-vibeify-social-account", key: account.id },
						React.createElement("div", { className: "dsh-vibeify-social-account-heading" },
							React.createElement("div", null,
								React.createElement("h3", null, account.label),
								React.createElement("span", { className: connected ? "is-connected" : stored ? "has-credential" : "" }, connected ? "Connected" : stored ? "Credential stored" : "Not connected"),
							),
							React.createElement("label", { className: "dsh-vibeify-social-enable" },
								React.createElement("input", { type: "checkbox", checked: drafts[account.enabled] === true, disabled: pending, onChange: (event) => setDrafts((current) => ({ ...current, [account.enabled]: event.target.checked })) }),
								React.createElement("span", null, "Use official API"),
							),
						),
						React.createElement("label", null,
							React.createElement("span", null, account.accountLabel),
							React.createElement("input", { type: "text", value: drafts[account.account] ?? "", disabled: pending, autoComplete: "off", spellCheck: "false", placeholder: account.placeholder, onChange: (event) => setDrafts((current) => ({ ...current, [account.account]: event.target.value })) }),
						),
						React.createElement("label", null,
							React.createElement("span", null, "Credential reference"),
							React.createElement("input", { type: "text", value: ref, disabled: pending, autoComplete: "off", spellCheck: "false", placeholder: account.credentialDefault, onChange: (event) => setDrafts((current) => ({ ...current, [account.credential]: event.target.value })) }),
						),
						React.createElement("label", null,
							React.createElement("span", null, "New access token or app password"),
							React.createElement("input", {
								type: "password",
								value: secretDrafts[account.id] ?? "",
								disabled: pending || secretPending !== null || !writable,
								autoComplete: "off",
								spellCheck: "false",
								placeholder: stored ? "Enter a replacement credential" : "Paste token or app password",
								onChange: (event) => setSecretDrafts((current) => ({ ...current, [account.id]: event.target.value })),
							}),
						),
						React.createElement("div", { className: "dsh-vibeify-social-secret-actions" },
							React.createElement("button", { type: "button", disabled: pending || secretPending !== null || !writable || String(secretDrafts[account.id] ?? "").trim().length === 0, onClick: () => saveSecret(account) }, secretPending === account.id ? "Saving…" : "Save credential"),
							stored ? React.createElement("button", { type: "button", className: "is-secondary", disabled: pending || secretPending !== null || !writable, onClick: () => removeSecret(account) }, "Remove credential") : null,
						),
					);
				};

				return React.createElement("section", { className: "dsh-vibeify-social-settings" },
					React.createElement("div", { className: "dsh-vibeify-social-intro" },
						React.createElement("p", { className: "dsh-vibeify-social-kicker" }, "VIBE SOCIAL DESK"),
						React.createElement("h2", null, "Optional automatic posting"),
						React.createElement("p", null, "You do not need to connect any account. By default, Social Desk copies each reviewed post and opens the normal social composer for your final click. Configure an official connection here only if you deliberately want unattended publishing for that channel."),
					),
					React.createElement("div", { className: "dsh-vibeify-social-grid" }, ...SOCIAL_DESK_ACCOUNTS.map(accountCard)),
					React.createElement("div", { className: "dsh-vibeify-social-actions" },
						React.createElement("button", { type: "button", disabled: pending || snapshot.writable !== true, onClick: save }, pending ? "Saving…" : "Save social settings"),
						React.createElement("button", { type: "button", className: "is-secondary", disabled: pending, onClick: refresh }, "Refresh connection status"),
					),
					message.length > 0 ? React.createElement("p", { className: "dsh-vibeify-social-message", role: "status" }, message) : null,
					React.createElement("p", { className: "dsh-vibeify-social-note" }, "Leave every switch off for the simple no-API route. Credential references are names, not secret values. Secrets are write-only: this page can replace or remove one but never reads or displays it. A channel is Connected only when its switch, required account identifier and referenced credential are all present."),
				);
			};
		}

		function updateStateCopy(component, kind) {
			if (component.state === "update-available") return "Update available";
			if (component.state === "awaiting-vibeify") return "New release detected — compatibility check pending";
			if (component.state === "current") return "Up to date";
			return kind === "codex" ? "Could not check the agent release" : "Could not check the latest release";
		}

		function updateDetail(component, kind) {
			if (kind === "codex" && component.state === "awaiting-vibeify") {
				return `Using ${component.current}. Codex ${component.latest} exists, but the current Vibeify release has qualified ${component.installable}; it will not be installed until the compatibility bundle is ready.`;
			}
			if (component.latest === null) return `Installed ${component.current}. The online version could not be read; nothing was changed.`;
			if (component.state === "update-available") return `Installed ${component.current} · safe update ${kind === "codex" ? component.installable : component.latest}`;
			return `Installed ${component.current} · latest ${component.latest}`;
		}

		function updatesSection(connection) {
			return function UpdatesSection() {
				const [report, setReport] = React.useState(null);
				const [checking, setChecking] = React.useState(true);
				const [error, setError] = React.useState("");
				const mounted = React.useRef(true);

				React.useEffect(() => () => {
					mounted.current = false;
				}, []);

				const check = React.useCallback(async (force = false) => {
					setChecking(true);
					setError("");
					try {
						const result = await connection.rpc.call(UPDATE_RPC_CHANNEL, "check", { force });
						if (!result.ok) throw new Error(result.error?.message ?? "Update check failed");
						if (mounted.current) setReport(result.value);
					} catch {
						if (mounted.current) setError("Updates could not be checked. Nothing was downloaded or changed.");
					} finally {
						if (mounted.current) setChecking(false);
					}
				}, [connection]);

				React.useEffect(() => {
					check(false);
				}, [check]);

				const rows = report === null ? [] : [
					{ key: "dsh", name: "DeepSeek Harness", component: report.components.dsh },
					{ key: "vibeify", name: "Vibeify", component: report.components.vibeify },
					...(report.components.codex.current === null ? [] : [{ key: "codex", name: "Codex agent", component: report.components.codex }]),
				];
				return React.createElement("section", { className: "dsh-vibeify-updates" },
					React.createElement("div", { className: "dsh-vibeify-updates-intro" },
						React.createElement("p", { className: "dsh-vibeify-updates-kicker" }, "SAFE UPDATES"),
						React.createElement("h2", null, "Updates"),
						React.createElement("p", null, "DSH and Vibeify's bundled Codex agent are checked separately. Checks read only public release information and never update or restart anything by themselves."),
					),
					checking && report === null ? React.createElement("p", { className: "dsh-vibeify-updates-progress", role: "status" }, "Checking current releases…") : null,
					...rows.map(({ key, name, component }) => React.createElement("article", { className: "dsh-vibeify-update-row", key },
						React.createElement("div", null,
							React.createElement("h3", null, name),
							React.createElement("p", null, updateDetail(component, key)),
						),
						React.createElement("span", { className: `dsh-vibeify-update-state is-${component.state}` }, updateStateCopy(component, key)),
					)),
					error.length > 0 ? React.createElement("p", { className: "dsh-vibeify-updates-error", role: "alert" }, error) : null,
					React.createElement("div", { className: "dsh-vibeify-update-actions" },
						React.createElement("button", { type: "button", disabled: checking, onClick: () => check(true) }, checking ? "Checking…" : "Check again"),
						report === null ? null : React.createElement("a", {
							className: "dsh-vibeify-update-download",
							href: report.updater.url,
							target: "_blank",
							rel: "noreferrer",
						}, report.updater.label || "Open updater guide"),
					),
					React.createElement("p", { className: "dsh-vibeify-updates-note" }, report?.updater?.note || "Finish active tasks before activating an update."),
				);
			};
		}

		function apply(ctx) {
			__DshVibeifyExperience.registerExperienceShell(ctx, { codexFeatures: CODEX_FEATURES_ENABLED });
			const { api } = ctx.get("connection");
			const visualSettings = ctx.settingsScope.bind({ namespace: VISUAL_SETTINGS_NAMESPACE });
			const socialDeskSettings = ctx.settingsScope.bind({ namespace: SOCIAL_DESK_SETTINGS_NAMESPACE });
			ctx.effect(() => {
				const style = document.createElement("style");
				style.id = UPDATE_STYLE_ID;
				style.textContent = `
.dsh-vibeify-updates { color: var(--dsw-alias-label-primary); padding: 4px 0 24px; }
.dsh-vibeify-updates-intro { max-width: 680px; margin-bottom: 18px; }
.dsh-vibeify-updates-kicker { margin: 0 0 4px !important; color: var(--dsw-alias-state-business-primary) !important; font-size: 11px !important; font-weight: 700; letter-spacing: .08em; }
.dsh-vibeify-updates h2 { margin: 0 0 7px; font-size: 22px; line-height: 1.25; }
.dsh-vibeify-updates h3 { margin: 0 0 5px; font-size: 15px; }
.dsh-vibeify-updates p { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.5; }
.dsh-vibeify-update-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 18px; align-items: center; padding: 15px 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.dsh-vibeify-update-state { max-width: 220px; color: var(--dsw-alias-label-secondary); border-radius: 999px; background: var(--dsw-alias-bg-layer-2); padding: 5px 10px; font-size: 11px; font-weight: 650; text-align: center; }
.dsh-vibeify-update-state.is-update-available { color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-state-business-tertiary); }
.dsh-vibeify-update-state.is-awaiting-vibeify { color: var(--dsw-alias-label-primary); }
.dsh-vibeify-update-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.dsh-vibeify-update-actions button,.dsh-vibeify-update-download { box-sizing: border-box; min-height: 38px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; padding: 0 14px; font: inherit; font-size: 13px; font-weight: 650; text-decoration: none; }
.dsh-vibeify-update-actions button { color: var(--dsw-alias-label-primary); cursor: pointer; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.dsh-vibeify-update-actions button:disabled { cursor: wait; opacity: .65; }
.dsh-vibeify-update-download { color: var(--dsw-alias-button-primary-label,#fff); background: var(--dsw-alias-button-primary-fill); }
.dsh-vibeify-updates-progress,.dsh-vibeify-updates-error,.dsh-vibeify-updates-note { margin-top: 14px !important; }
.dsh-vibeify-updates-error { color: var(--dsw-alias-label-error,#b42318) !important; }
.dsh-vibeify-updates-note { max-width: 680px; }
@media (max-width: 720px) { .dsh-vibeify-update-row { grid-template-columns: 1fr; gap: 9px; } .dsh-vibeify-update-state { justify-self: start; } }
`;
				document.getElementById(UPDATE_STYLE_ID)?.remove();
				document.head.appendChild(style);
				return () => style.remove();
			}, "dsh-vibeify: update settings styles");

			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "vibeify-updates",
				order: 17,
				label: "Updates",
			}, updatesSection(ctx.connection)));

			ctx.effect(() => {
				const style = document.createElement("style");
				style.id = VISUAL_SETTINGS_STYLE_ID;
				style.textContent = `
.dsh-vibeify-visual-settings { color:var(--dsw-alias-label-primary); padding:4px 0 28px; }
.dsh-vibeify-visual-intro { max-width:720px; margin-bottom:18px; }
.dsh-vibeify-visual-kicker { margin:0 0 4px!important; color:var(--dsw-alias-state-business-primary)!important; font-size:11px!important; font-weight:750; letter-spacing:.09em; }
.dsh-vibeify-visual-settings h2 { margin:0 0 7px; font-size:22px; line-height:1.25; }
.dsh-vibeify-visual-settings h3 { margin:0; font-size:16px; }
.dsh-vibeify-visual-settings p { margin:0; color:var(--dsw-alias-label-secondary); font-size:13px; line-height:1.55; }
.dsh-vibeify-visual-free { margin:18px 0; padding:13px 15px; display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px 18px; border:1px solid var(--dsw-alias-border-l1); border-radius:12px; background:var(--dsw-alias-bg-layer-2); font-size:13px; }.dsh-vibeify-visual-free span { color:var(--dsw-alias-label-secondary); }.dsh-vibeify-visual-free strong { font-weight:700; }
.dsh-vibeify-visual-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.dsh-vibeify-visual-provider { min-width:0; padding:16px; border:1px solid var(--dsw-alias-border-l1); border-radius:14px; background:var(--dsw-alias-bg-layer-1); }
.dsh-vibeify-visual-provider-heading { display:flex; align-items:start; justify-content:space-between; gap:14px; }.dsh-vibeify-visual-provider-heading a { color:var(--dsw-alias-state-business-primary); font-size:11px; }.dsh-vibeify-visual-provider-heading>span { flex:none; padding:4px 8px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:10px; font-weight:700; }.dsh-vibeify-visual-provider-heading>span.is-configured { color:var(--dsw-alias-state-business-primary); background:var(--dsw-alias-state-business-tertiary); }
.dsh-vibeify-visual-provider label { margin-top:14px; display:grid; gap:6px; color:var(--dsw-alias-label-secondary); font-size:11px; font-weight:650; }.dsh-vibeify-visual-provider input { width:100%; min-height:40px; padding:0 11px; color:var(--dsw-alias-label-primary); border:1px solid var(--dsw-alias-border-l1); border-radius:9px; outline:0; background:var(--dsw-alias-bg-base); font:inherit; }.dsh-vibeify-visual-provider input:focus { border-color:var(--dsw-alias-state-business-primary); box-shadow:0 0 0 3px var(--dsw-alias-state-business-tertiary); }
.dsh-vibeify-visual-actions { margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; }.dsh-vibeify-visual-actions button { min-height:34px; padding:0 12px; border:1px solid var(--dsw-alias-button-primary-fill); border-radius:8px; color:var(--dsw-alias-button-primary-label,#fff); background:var(--dsw-alias-button-primary-fill); cursor:pointer; font:inherit; font-size:11px; font-weight:700; }.dsh-vibeify-visual-actions button.is-secondary { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); }.dsh-vibeify-visual-actions button:disabled { cursor:not-allowed; opacity:.55; }
.dsh-vibeify-visual-message { margin-top:14px!important; color:var(--dsw-alias-label-primary)!important; font-weight:650; }.dsh-vibeify-visual-note { max-width:720px; margin-top:14px!important; font-size:11px!important; }
@media (max-width:760px) { .dsh-vibeify-visual-grid { grid-template-columns:1fr; } }
`;
				document.getElementById(VISUAL_SETTINGS_STYLE_ID)?.remove();
				document.head.appendChild(style);
				return () => style.remove();
			}, "dsh-vibeify: visual source settings styles");

			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "vibeify-visual-sources",
				order: 16,
				label: "Images",
			}, visualSourcesSection(visualSettings, api)));

			ctx.effect(() => {
				const style = document.createElement("style");
				style.id = SOCIAL_DESK_SETTINGS_STYLE_ID;
				style.textContent = `
.dsh-vibeify-social-settings { color:var(--dsw-alias-label-primary); padding:4px 0 28px; }
.dsh-vibeify-social-intro { max-width:760px; margin-bottom:18px; }
.dsh-vibeify-social-kicker { margin:0 0 4px!important; color:var(--dsw-alias-state-business-primary)!important; font-size:11px!important; font-weight:750; letter-spacing:.09em; }
.dsh-vibeify-social-settings h2 { margin:0 0 7px; font-size:22px; line-height:1.25; }
.dsh-vibeify-social-settings h3 { margin:0; font-size:16px; }
.dsh-vibeify-social-settings p { margin:0; color:var(--dsw-alias-label-secondary); font-size:13px; line-height:1.55; }
.dsh-vibeify-social-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.dsh-vibeify-social-account { min-width:0; padding:16px; border:1px solid var(--dsw-alias-border-l1); border-radius:14px; background:var(--dsw-alias-bg-layer-1); }
.dsh-vibeify-social-account-heading { display:flex; align-items:start; justify-content:space-between; gap:14px; }.dsh-vibeify-social-account-heading>div>span { display:inline-block; margin-top:5px; padding:4px 8px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:10px; font-weight:700; }.dsh-vibeify-social-account-heading>div>span.has-credential { color:var(--dsw-alias-label-primary); }.dsh-vibeify-social-account-heading>div>span.is-connected { color:var(--dsw-alias-state-business-primary); background:var(--dsw-alias-state-business-tertiary); }
.dsh-vibeify-social-enable { display:flex!important; grid-template-columns:auto 1fr!important; align-items:center; gap:7px!important; margin:0!important; color:var(--dsw-alias-label-primary)!important; }.dsh-vibeify-social-enable input { width:16px!important; min-height:16px!important; }
.dsh-vibeify-social-account>label { margin-top:13px; display:grid; gap:6px; color:var(--dsw-alias-label-secondary); font-size:11px; font-weight:650; }.dsh-vibeify-social-account>label input[type="text"],.dsh-vibeify-social-account>label input[type="password"] { box-sizing:border-box; width:100%; min-height:40px; padding:0 11px; color:var(--dsw-alias-label-primary); border:1px solid var(--dsw-alias-border-l1); border-radius:9px; outline:0; background:var(--dsw-alias-bg-base); font:inherit; }.dsh-vibeify-social-account>label input:focus { border-color:var(--dsw-alias-state-business-primary); box-shadow:0 0 0 3px var(--dsw-alias-state-business-tertiary); }
.dsh-vibeify-social-secret-actions { margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; }.dsh-vibeify-social-secret-actions button { min-height:34px; padding:0 11px; border:1px solid var(--dsw-alias-button-primary-fill); border-radius:9px; color:var(--dsw-alias-button-primary-label,#fff); background:var(--dsw-alias-button-primary-fill); cursor:pointer; font:inherit; font-size:11px; font-weight:700; }.dsh-vibeify-social-secret-actions button.is-secondary { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); }.dsh-vibeify-social-secret-actions button:disabled { cursor:not-allowed; opacity:.55; }
.dsh-vibeify-social-actions { margin-top:16px; display:flex; flex-wrap:wrap; gap:8px; }.dsh-vibeify-social-actions button { min-height:38px; padding:0 14px; border:1px solid var(--dsw-alias-button-primary-fill); border-radius:9px; color:var(--dsw-alias-button-primary-label,#fff); background:var(--dsw-alias-button-primary-fill); cursor:pointer; font:inherit; font-size:12px; font-weight:700; }.dsh-vibeify-social-actions button.is-secondary { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); }.dsh-vibeify-social-actions button:disabled { cursor:not-allowed; opacity:.55; }
.dsh-vibeify-social-message { margin-top:14px!important; color:var(--dsw-alias-label-primary)!important; font-weight:650; }.dsh-vibeify-social-note { max-width:760px; margin-top:14px!important; font-size:11px!important; }
@media (max-width:760px) { .dsh-vibeify-social-grid { grid-template-columns:1fr; } }
`;
				document.getElementById(SOCIAL_DESK_SETTINGS_STYLE_ID)?.remove();
				document.head.appendChild(style);
				return () => style.remove();
			}, "dsh-vibeify: Social Desk settings styles");

			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "vibeify-social-accounts",
				order: 18,
				label: "Social Desk",
			}, socialDeskSettingsSection(socialDeskSettings, api, ctx.connection)));
			if (CODEX_FEATURES_ENABLED) {
				const sessions = ctx.get("sessions");
				const conversationSettings = ctx.settingsScope.bind({
					namespace: CONVERSATION_SETTINGS_NAMESPACE,
				});
				const codexSettings = ctx.settingsScope.bind({
					namespace: CODEX_SETTINGS_NAMESPACE,
				});

			ctx.effect(() => {
				const style = document.createElement("style");
				style.id = CODEX_CAPABILITY_STYLE_ID;
				style.textContent = `
.dsh-vibeify-capability { color: var(--dsw-alias-label-primary); padding: 4px 0 24px; }
.dsh-vibeify-capability-intro { max-width: 620px; margin-bottom: 18px; }
.dsh-vibeify-capability-kicker { margin: 0 0 4px; color: var(--dsw-alias-state-business-primary); font-size: 11px; font-weight: 700; letter-spacing: .08em; }
.dsh-vibeify-capability h2 { margin: 0 0 7px; font-size: 22px; line-height: 1.25; }
.dsh-vibeify-capability p { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.55; }
.dsh-vibeify-capability-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
.dsh-vibeify-capability-card { box-sizing: border-box; min-height: 142px; cursor: pointer; color: var(--dsw-alias-label-primary); text-align: left; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 7px; font: inherit; }
.dsh-vibeify-capability-card:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-vibeify-capability-card[aria-pressed="true"] { border-color: var(--dsw-alias-state-business-primary); box-shadow: inset 0 0 0 1px var(--dsw-alias-state-business-primary); }
.dsh-vibeify-capability-card:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.dsh-vibeify-capability-card:disabled { cursor: wait; opacity: .65; }
.dsh-vibeify-capability-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 15px; font-weight: 650; }
.dsh-vibeify-capability-badge { color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-state-business-tertiary); border-radius: 999px; padding: 2px 7px; font-size: 10px; font-weight: 700; }
.dsh-vibeify-capability-model { color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 550; }
.dsh-vibeify-capability-description { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.45; }
.dsh-vibeify-capability-note { margin-top: 14px !important; }
.dsh-vibeify-capability-error { margin-top: 12px !important; color: var(--dsw-alias-label-error, #b42318) !important; }
@media (max-width: 720px) { .dsh-vibeify-capability-grid { grid-template-columns: 1fr; } }
`;
				document.getElementById(CODEX_CAPABILITY_STYLE_ID)?.remove();
				document.head.appendChild(style);
				return () => style.remove();
			}, "dsh-vibeify: Codex capability settings styles");

			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "codex-capability",
				order: 15,
				label: "Codex",
			}, capabilitySection(codexSettings)));

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

				const collapseSettledProgress = () => {
					for (const row of document.querySelectorAll('[data-variant="think"][data-codex-progress-opened="true"]')) {
						__DshVibeifyExperience.collapseCompletedThinking(row);
					}
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
					collapseSettledProgress();
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
			}

			ctx.effect(() => {
				// DSH defines its design tokens on body, so inline body values reliably
				// override both the light and dark upstream palettes.
				const rootStyle = document.body.style;
				const originalValues = new Map(
					VIBE_VARIABLES.map((variable) => [variable, rootStyle.getPropertyValue(variable)]),
				);
				let selected = "system";
				let localVibeStorage = null;
				let editorialProfile = __DshVibeifyExperience.loadEditorialProfile(null);

				try {
					localVibeStorage = window.localStorage;
					editorialProfile = __DshVibeifyExperience.loadEditorialProfile(localVibeStorage);
					const stored = localVibeStorage.getItem(VIBE_STORAGE_KEY);
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
						localVibeStorage?.setItem(VIBE_STORAGE_KEY, name);
					} catch {
						// Keep the selected VIBE for this page load when storage is unavailable.
					}
				};

				const applyEditorialDirection = (options) => {
					editorialProfile = __DshVibeifyExperience.saveEditorialProfile(localVibeStorage, options);
					window.dispatchEvent(new CustomEvent(EDITORIAL_SETTINGS_EVENT, { detail: editorialProfile }));
					return editorialProfile;
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
			  min-width: 112px;
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
			  width: min(440px, calc(100vw - 28px));
			  max-height: min(720px, calc(100vh - 84px));
			  overflow:auto;
  box-sizing: border-box;
			  padding: 14px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 13px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 12px 32px rgb(0 0 0 / 20%);
}
#${VIBE_ROOT_ID} .dsh-vibeify-menu[hidden] { display: none; }
#${VIBE_ROOT_ID} .dsh-vibeify-heading {
			  margin: 2px 0 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
			  text-transform: uppercase;
			}
			#${VIBE_ROOT_ID} .dsh-vibeify-intro {
			  margin: 0 0 15px;
			  color: var(--dsw-alias-label-secondary);
			  font-size: 12px;
			  line-height: 1.45;
			}
			#${VIBE_ROOT_ID} .dsh-vibeify-section + .dsh-vibeify-section {
			  margin-top: 16px;
			  padding-top: 14px;
			  border-top: 1px solid var(--dsw-alias-border-l1);
			}
			#${VIBE_ROOT_ID} .dsh-vibeify-palette {
			  display: grid;
			  grid-template-columns: repeat(5,minmax(0,1fr));
			  gap: 5px;
			}
#${VIBE_ROOT_ID} .dsh-vibeify-choice {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
			  justify-content: center;
			  gap: 5px;
			  padding: 6px 4px;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
			  text-align: center;
			  font-size: 11px;
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
			#${VIBE_ROOT_ID} .dsh-vibeify-field {
			  display: grid;
			  gap: 6px;
			}
			#${VIBE_ROOT_ID} .dsh-vibeify-tribes { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin:2px 0 8px; }
			#${VIBE_ROOT_ID} .dsh-vibeify-tribe { min-height:34px; padding:7px 9px; display:flex; align-items:center; gap:7px; color:var(--dsw-alias-label-primary); border:1px solid var(--dsw-alias-border-l1); border-radius:9px; background:var(--dsw-alias-bg-layer-2); cursor:pointer; font:inherit; font-size:11px; text-align:left; }
			#${VIBE_ROOT_ID} .dsh-vibeify-tribe[aria-pressed="true"] { border-color:var(--dsw-alias-state-business-primary); background:var(--dsw-alias-state-business-tertiary); font-weight:650; }
			#${VIBE_ROOT_ID} .dsh-vibeify-controls { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:5px 0; }
			#${VIBE_ROOT_ID} .dsh-vibeify-control { padding:8px 9px; border:1px solid var(--dsw-alias-border-l1); border-radius:9px; background:var(--dsw-alias-bg-layer-2); }
			#${VIBE_ROOT_ID} .dsh-vibeify-control input[type="range"] { width:100%; }
			#${VIBE_ROOT_ID} .dsh-vibeify-money { margin-top:5px; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:6px; color:var(--dsw-alias-label-secondary); font-size:11px; font-weight:600; }
			#${VIBE_ROOT_ID} .dsh-vibeify-money input { width:100%; min-width:0; box-sizing:border-box; padding:6px 7px; color:var(--dsw-alias-label-primary); border:1px solid var(--dsw-alias-border-l1); border-radius:6px; background:var(--dsw-alias-bg-layer-1); font:inherit; font-variant-numeric:tabular-nums; }
			#${VIBE_ROOT_ID} .dsh-vibeify-reset { color:var(--dsw-alias-label-secondary); border:0; background:none; cursor:pointer; text-decoration:underline; font:inherit; font-size:11px; }
			#${VIBE_ROOT_ID} .dsh-vibeify-field label {
			  color: var(--dsw-alias-label-primary);
			  font-size: 12px;
			  font-weight: 650;
			}
			#${VIBE_ROOT_ID} select,#${VIBE_ROOT_ID} textarea {
			  width: 100%;
			  box-sizing: border-box;
			  color: var(--dsw-alias-label-primary);
			  border: 1px solid var(--dsw-alias-border-l1);
			  border-radius: 9px;
			  background: var(--dsw-alias-bg-layer-2);
			  padding: 9px 10px;
			  font: inherit;
			}
			#${VIBE_ROOT_ID} textarea { min-height: 96px; resize: vertical; line-height: 1.4; }
			#${VIBE_ROOT_ID} .dsh-vibeify-direction-copy {
			  min-height: 34px;
			  margin: 0;
			  color: var(--dsw-alias-label-secondary);
			  font-size: 11px;
			  line-height: 1.45;
			}
			#${VIBE_ROOT_ID} .dsh-vibeify-apply {
			  min-height: 36px;
			  color: var(--dsw-alias-button-primary-label,#fff);
			  cursor: pointer;
			  border: 0;
			  border-radius: 9px;
			  background: var(--dsw-alias-button-primary-fill);
			  padding: 0 13px;
			  font: inherit;
			  font-weight: 650;
			}
			#${VIBE_ROOT_ID} .dsh-vibeify-status {
			  min-height: 16px;
			  margin: 7px 0 0;
			  color: var(--dsw-alias-label-tertiary);
			  font-size: 10px;
			}
#${VIBE_ROOT_ID} button:focus-visible,#${VIBE_ROOT_ID} select:focus-visible,#${VIBE_ROOT_ID} textarea:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}
`;
				document.getElementById(VIBE_STYLE_ID)?.remove();
				document.head.appendChild(style);

				const picker = document.createElement("div");
				picker.id = VIBE_ROOT_ID;
				picker.innerHTML = `
			<button class="dsh-vibeify-trigger" type="button" aria-haspopup="dialog" aria-expanded="false">VIBE settings</button>
			<div class="dsh-vibeify-menu" role="dialog" aria-label="Vibe settings" hidden>
			  <div class="dsh-vibeify-heading">Vibe settings</div>
			  <p class="dsh-vibeify-intro">Colour changes the Chat surface. Editorial direction shapes the next content added to the top of Vibe.</p>
			  <section class="dsh-vibeify-section" aria-labelledby="dsh-vibeify-colour-heading">
			    <div id="dsh-vibeify-colour-heading" class="dsh-vibeify-heading">Colour theme</div>
			    <div class="dsh-vibeify-palette" role="radiogroup" aria-label="Chat colour theme">
			      <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="system" aria-label="System"><span class="dsh-vibeify-swatch" style="--vibe-swatch: linear-gradient(135deg,#ffffff 50%,#242424 50%)"></span>System</button>
			      <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="ocean" aria-label="Ocean"><span class="dsh-vibeify-swatch" style="--vibe-swatch:#1769e0"></span>Ocean</button>
			      <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="broadcast" aria-label="Broadcast"><span class="dsh-vibeify-swatch" style="--vibe-swatch:#b61924"></span>Broadcast</button>
			      <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="forest" aria-label="Forest"><span class="dsh-vibeify-swatch" style="--vibe-swatch:#19704b"></span>Forest</button>
			      <button class="dsh-vibeify-choice" type="button" role="radio" data-vibe="synthwave" aria-label="Synthwave"><span class="dsh-vibeify-swatch" style="--vibe-swatch:#b94cff"></span>Synth</button>
			    </div>
			  </section>
			  <section class="dsh-vibeify-section" aria-labelledby="dsh-vibeify-editorial-heading">
			    <div id="dsh-vibeify-editorial-heading" class="dsh-vibeify-heading">Editorial direction</div>
			    <div class="dsh-vibeify-field">
			      <label>Who should this edition understand?</label>
			      <div class="dsh-vibeify-tribes" aria-label="Editorial tribes">${Object.values(EDITORIAL_TRIBES).map(({ id, label }) => `<button class="dsh-vibeify-tribe" type="button" data-tribe="${id}" aria-pressed="false">${label}</button>`).join("")}</div>
			      <div class="dsh-vibeify-controls">
			        <label class="dsh-vibeify-control">Useful surprises <output id="dsh-vibeify-serendipity-value">20%</output><input id="dsh-vibeify-serendipity" type="range" min="10" max="40" step="5" value="20"></label>
			        <label class="dsh-vibeify-control">DeepSeek daily maximum <span class="dsh-vibeify-money"><span aria-hidden="true">$</span><input id="dsh-vibeify-budget" type="number" min="0" max="2" step="0.25" value="2.00" inputmode="decimal" aria-label="DeepSeek daily maximum in US dollars"><span>USD / day</span></span></label>
			        <label class="dsh-vibeify-control"><input id="dsh-vibeify-background" type="checkbox" checked> Fill the hidden reserve</label>
			        <label class="dsh-vibeify-control"><input id="dsh-vibeify-content-notes" type="checkbox" checked> Gentle content notes</label>
			      </div>
			      <label for="dsh-vibeify-editor-note">Add your own editor note <span aria-hidden="true">(optional)</span></label>
			      <textarea id="dsh-vibeify-editor-note" maxlength="360" aria-label="Add your own editor note" placeholder="For example: more independent voices, shorter articles, dry humour, and links to original creators"></textarea>
			      <button class="dsh-vibeify-apply" type="button">Apply editorial direction</button>
			      <button class="dsh-vibeify-reset" type="button">Reset what the editor has learned</button>
			    </div>
			    <p class="dsh-vibeify-status" aria-live="polite">Stored in this browser. Do not enter secrets.</p>
			  </section>
			</div>`;

				const trigger = picker.querySelector(".dsh-vibeify-trigger");
				const menu = picker.querySelector(".dsh-vibeify-menu");
				const customDirection = picker.querySelector("textarea");
				const serendipity = picker.querySelector("#dsh-vibeify-serendipity");
				const serendipityValue = picker.querySelector("#dsh-vibeify-serendipity-value");
				const budget = picker.querySelector("#dsh-vibeify-budget");
				const background = picker.querySelector("#dsh-vibeify-background");
				const contentNotes = picker.querySelector("#dsh-vibeify-content-notes");
				const status = picker.querySelector(".dsh-vibeify-status");
				const renderSelection = () => {
					for (const button of picker.querySelectorAll("[data-vibe]")) {
						button.setAttribute("aria-checked", String(button.dataset.vibe === selected));
					}
					for (const button of picker.querySelectorAll("[data-tribe]")) button.setAttribute("aria-pressed", String(editorialProfile.tribes.includes(button.dataset.tribe)));
					customDirection.value = editorialProfile.customDirection;
					serendipity.value = String(Math.round(editorialProfile.serendipity * 100));
					serendipityValue.textContent = `${serendipity.value}%`;
					budget.value = Number(editorialProfile.dailyBudgetUsd).toFixed(2);
					background.checked = editorialProfile.backgroundEditor;
					contentNotes.checked = editorialProfile.contentNotes;
					trigger.title = `Vibe settings · ${VIBE_PRESETS[selected].label} · ${editorialProfile.label}`;
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
						return;
					}
					const tribe = event.target instanceof Element ? event.target.closest("[data-tribe]") : null;
					if (tribe?.dataset.tribe in EDITORIAL_TRIBES) {
						const selectedTribes = new Set([...picker.querySelectorAll('[data-tribe][aria-pressed="true"]')].map((button) => button.dataset.tribe));
						if (selectedTribes.has(tribe.dataset.tribe) && selectedTribes.size > 1) selectedTribes.delete(tribe.dataset.tribe); else selectedTribes.add(tribe.dataset.tribe);
						for (const button of picker.querySelectorAll("[data-tribe]")) button.setAttribute("aria-pressed", String(selectedTribes.has(button.dataset.tribe)));
						return;
					}
					if (event.target instanceof Element && event.target.closest(".dsh-vibeify-apply")) {
						const selectedTribes = [...picker.querySelectorAll('[data-tribe][aria-pressed="true"]')].map((button) => button.dataset.tribe);
						editorialProfile = applyEditorialDirection({ tribes: selectedTribes, customDirection: customDirection.value, serendipity: Number(serendipity.value) / 100, backgroundEditor: background.checked, dailyBudgetUsd: Number(budget.value), contentNotes: contentNotes.checked, clickToLoadMedia: true });
						status.textContent = `Applied: ${editorialProfile.label}. New Vibe content will use this direction.`;
						renderSelection();
						return;
					}
					if (event.target instanceof Element && event.target.closest(".dsh-vibeify-reset")) {
						__DshVibeifyExperience.resetEditorialLearning(localVibeStorage);
						status.textContent = "Editorial learning reset on this device.";
						return;
					}
					if (event.target instanceof Element && event.target.closest(".dsh-vibeify-trigger")) {
						setOpen(menu.hidden);
					}
				};
				const onSerendipity = () => { serendipityValue.textContent = `${serendipity.value}%`; };
				const onDocumentClick = (event) => {
					if (!picker.contains(event.target)) setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key !== "Escape" || menu.hidden) return;
					setOpen(false);
					trigger.focus();
				};

				picker.addEventListener("click", onPickerClick);
				serendipity.addEventListener("input", onSerendipity);
				document.addEventListener("click", onDocumentClick);
				document.addEventListener("keydown", onKeyDown);
				document.body.appendChild(picker);
				applyVibe(selected);
				renderSelection();

				return () => {
					picker.removeEventListener("click", onPickerClick);
					serendipity.removeEventListener("input", onSerendipity);
					document.removeEventListener("click", onDocumentClick);
					document.removeEventListener("keydown", onKeyDown);
					picker.remove();
					style.remove();
					restoreOriginals();
				};
			}, "dsh-vibeify: local colour and editorial settings");
		}

		exports.apply = apply;
		exports.inject = ["connection", "sessions", "settingsScope", "slots"];
		return module.exports;
	},
});
