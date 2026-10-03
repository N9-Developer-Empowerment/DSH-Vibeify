import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function localDshUrl(log, port) {
  const base = `http://127.0.0.1:${Number(port)}/`;
  const candidates = String(log).match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/g) || [];
  return candidates.filter((url) => new URL(url).origin === new URL(base).origin).at(-1) || base;
}

export async function dshReadiness(port, logFile, startupLog) {
  const log = startupLog ?? (logFile ? await readFile(logFile, 'utf8').catch(() => '') : '');
  const url = localDshUrl(log, port);
  try {
    let response = await fetch(url, { signal: AbortSignal.timeout(1500), redirect: 'manual' });
    if (response.status === 303) {
      const destination = new URL(response.headers.get('location') || '/', url);
      const cookies = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
      await response.body?.cancel();
      if (destination.origin !== new URL(url).origin || !cookies) return { ready: false, status: 303, url };
      response = await fetch(destination, { headers: { cookie: cookies }, signal: AbortSignal.timeout(1500), redirect: 'manual' });
    }
    await response.body?.cancel();
    return { ready: response.status === 200, status: response.status, url };
  } catch { return { ready: false, status: null, url }; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [action, port = '3080', logFile] = process.argv.slice(2);
  const result = await dshReadiness(port, logFile);
  if (action === 'url') process.stdout.write(result.url);
  else if (action === 'check') process.exitCode = result.ready ? 0 : 1;
  else throw new Error('Usage: dsh-web-readiness.mjs check|url <port> <server-log>');
}
