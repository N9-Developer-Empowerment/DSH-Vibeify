import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const EMPTY_QUEUE = Object.freeze({ version: 1, items: Object.freeze([]) });

function clone(value) {
  return structuredClone(value);
}

function queueDocument(value) {
  if (value === null || typeof value !== "object" || value.version !== 1 || !Array.isArray(value.items)) return clone(EMPTY_QUEUE);
  return { version: 1, items: value.items };
}

export function createMemoryQueueStore(initial = EMPTY_QUEUE) {
  let value = queueDocument(initial);
  return Object.freeze({
    async read() { return clone(value); },
    async write(next) { value = queueDocument(clone(next)); },
  });
}

export function createFileQueueStore(path) {
  if (typeof path !== "string" || path.trim() === "") throw new TypeError("A Social Desk queue path is required.");
  return Object.freeze({
    async read() {
      try {
        return queueDocument(JSON.parse(await readFile(path, "utf8")));
      } catch (cause) {
        if (cause?.code === "ENOENT") return clone(EMPTY_QUEUE);
        throw cause;
      }
    },
    async write(next) {
      const directory = dirname(path);
      const temporary = `${path}.new`;
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(temporary, `${JSON.stringify(queueDocument(next), null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, path);
    },
  });
}

