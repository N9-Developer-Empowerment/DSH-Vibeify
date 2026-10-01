/** Fit authored fixed-width apps without rewriting their canvas, controls or coordinates. */
export function fitInteractiveContent() {
  const body = document.body;
  const root = body.querySelector('main, [role="main"]') ?? body.firstElementChild;
  if (!root) return;
  const style = getComputedStyle(root);
  const limit = style.maxWidth.endsWith('px') ? Number.parseFloat(style.maxWidth) : 0;
  const padding = Number.parseFloat(getComputedStyle(body).paddingLeft) + Number.parseFloat(getComputedStyle(body).paddingRight);
  const designWidth = limit > 0 ? limit + padding : 0;
  let lastHeight = 0;
  const fit = (force = false) => {
    const width = document.documentElement.clientWidth;
    const scale = designWidth > 0 ? Math.max(1, Math.min(6, width / designWidth)) : 1;
    body.style.width = scale > 1 ? `${width / scale}px` : '100%';
    body.style.zoom = String(scale);
    const height = Math.ceil(Math.max(body.scrollHeight, body.getBoundingClientRect().height / scale) * scale);
    if (force || height !== lastHeight) {
      lastHeight = height;
      parent.postMessage({type: 'vibe:interactive-size', height}, '*');
    }
  };
  new ResizeObserver(() => fit()).observe(body);
  window.addEventListener("resize", () => fit());
  window.addEventListener("message", event => {
    if (event.source === parent && event.data?.type === "vibe:interactive-measure") fit(true);
  });
  fit();
}

/** Opaque frames cannot be inspected. Accept only bounded sizes from a displayed app frame. */
export function installInteractiveSizing() {
  window.addEventListener('message', event => {
    const data = event.data;
    if (data?.type !== 'vibe:interactive-size' || !Number.isFinite(data.height)) return;
    const frame = [...document.querySelectorAll('iframe.vibe-interactive, .vibe-interactive iframe')]
      .find(item => item.contentWindow === event.source);
    if (!frame) return;
    frame.style.height = `${Math.max(240, Math.min(6000, Math.ceil(data.height)))}px`;
  });
  const measure = frame => frame.contentWindow?.postMessage({type: 'vibe:interactive-measure'}, '*');
  // Handles either load order: the frame can finish before or after this module.
  window.addEventListener('load', event => {
    if (event.target?.matches?.('iframe.vibe-interactive, .vibe-interactive iframe')) measure(event.target);
  }, true);
  document.querySelectorAll('iframe.vibe-interactive, .vibe-interactive iframe').forEach(measure);
}
