import { getRequestEvent } from "@tanstack/react-start/server";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

interface D1Result<T> {
  results: T[];
  success: boolean;
  meta: unknown;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<{ meta: unknown }>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

function getCfDb(): D1Database | null {
  try {
    const event = getRequestEvent();
    const env = (
      event?.nativeEvent as unknown as {
        context?: { cloudflare?: { env?: { DB?: D1Database } } };
      }
    )?.context?.cloudflare?.env;
    return env?.DB ?? null;
  } catch {
    return null;
  }
}

// Node.js local SQLite fallback for npm run dev (no Cloudflare context)
let _localDb: import("better-sqlite3").Database | null = null;

function getLocalDb(): import("better-sqlite3").Database {
  if (_localDb) return _localDb;
  // Find the wrangler local D1 SQLite file
  const dir = path.join(process.cwd(), ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  let dbPath: string | null = null;
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sqlite") && !f.includes("metadata"));
    if (files.length > 0) dbPath = path.join(dir, files[0]);
  }
  if (!dbPath) {
    throw new Error(
      "Base de données locale introuvable. Exécute: npx wrangler d1 execute DB --local --file=schema.sql",
    );
  }
  const Database = _require("better-sqlite3");
  _localDb = new Database(dbPath) as import("better-sqlite3").Database;
  return _localDb;
}

function wrapLocalDb(): D1Database {
  return {
    prepare(sql: string): D1PreparedStatement {
      let _params: unknown[] = [];
      const stmt = {
        bind(...values: unknown[]): D1PreparedStatement {
          _params = values;
          return stmt;
        },
        async first<T>(): Promise<T | null> {
          const db = getLocalDb();
          const prepared = db.prepare(sql);
          const row = prepared.get(..._params) as T | undefined;
          return row ?? null;
        },
        async all<T>(): Promise<D1Result<T>> {
          const db = getLocalDb();
          const prepared = db.prepare(sql);
          const results = prepared.all(..._params) as T[];
          return { results, success: true, meta: {} };
        },
        async run(): Promise<{ meta: unknown }> {
          const db = getLocalDb();
          const prepared = db.prepare(sql);
          prepared.run(..._params);
          return { meta: {} };
        },
      };
      return stmt;
    },
    async batch<T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        await stmt.run();
        results.push({ results: [], success: true, meta: {} });
      }
      return results;
    },
  };
}

function getDb(): D1Database {
  return getCfDb() ?? wrapLocalDb();
}

export async function dbQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getDb().prepare(sql).bind(...params).all<T>();
  return result.results ?? [];
}

export async function dbFirst<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  return getDb().prepare(sql).bind(...params).first<T>();
}

export async function dbRun(sql: string, params: unknown[] = []): Promise<void> {
  await getDb().prepare(sql).bind(...params).run();
}

export async function dbBatch(statements: { sql: string; params?: unknown[] }[]): Promise<void> {
  const db = getDb();
  const stmts = statements.map(({ sql, params = [] }) => db.prepare(sql).bind(...params));
  await db.batch(stmts);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
