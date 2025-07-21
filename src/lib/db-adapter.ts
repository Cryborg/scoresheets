// Database adapter to handle both sync (better-sqlite3) and async (Turso) operations

// Database query parameters type
type DbParams = (string | number | boolean | null | undefined)[];

// Database result types
interface DbRunResult {
  lastInsertRowid: number;
  changes: number;
}

// Generic row type - can be extended for specific table structures
type DbRow = Record<string, unknown>;

// Statement interface with proper typing
interface DbStatement {
  run(...params: DbParams): DbRunResult;
  get<T = DbRow>(...params: DbParams): T | undefined;
  all<T = DbRow>(...params: DbParams): T[];
}

// Database instances - typed for better-sqlite3 and Turso client
interface SyncDatabase {
  prepare(sql: string): {
    run(...params: DbParams): { lastInsertRowid: number | bigint; changes: number };
    get(...params: DbParams): DbRow | undefined;
    all(...params: DbParams): DbRow[];
  };
  exec(sql: string): void;
  transaction<T>(fn: () => T): () => T;
}

interface AsyncDatabase {
  prepare(sql: string): {
    run(...params: DbParams): Promise<{ lastInsertRowId: number | bigint; rowsAffected: number }>;
    get(...params: DbParams): Promise<DbRow | undefined>;
    all(...params: DbParams): Promise<DbRow[]>;
  };
  execute(sql: string | { sql: string; args: DbParams }): Promise<{
    lastInsertRowId: number | bigint;
    rowsAffected: number;
    rows: DbRow[];
  }>;
}

// Transaction function type
type TransactionFunction<T = unknown> = () => T;

// Main adapter interface
interface DbAdapter {
  prepare(sql: string): DbStatement;
  exec(sql: string): void;
  transaction<T>(fn: TransactionFunction<T>): TransactionFunction<T>;
}

function createSyncAdapter(db: SyncDatabase): DbAdapter {
  return {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql);
      return {
        run: (...params: DbParams): DbRunResult => {
          const result = stmt.run(...params);
          return {
            lastInsertRowid: Number(result.lastInsertRowid),
            changes: result.changes
          };
        },
        get: <T = DbRow>(...params: DbParams): T | undefined => {
          return stmt.get(...params) as T | undefined;
        },
        all: <T = DbRow>(...params: DbParams): T[] => {
          return stmt.all(...params) as T[];
        }
      };
    },
    exec: (sql: string) => db.exec(sql),
    transaction: <T>(fn: TransactionFunction<T>) => db.transaction(fn)
  };
}

function createAsyncAdapter(db: AsyncDatabase): DbAdapter {
  return {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql);
      return {
        run: (...params: DbParams): DbRunResult => {
          // For async operations, we need to handle them differently
          // This is a temporary sync wrapper - we'll need to update calling code
          let result: DbRunResult = { lastInsertRowid: 0, changes: 0 };
          stmt.run(...params).then((r) => {
            result = {
              lastInsertRowid: Number(r.lastInsertRowId),
              changes: r.rowsAffected
            };
          }).catch(console.error);
          return result;
        },
        get: <T = DbRow>(...params: DbParams): T | undefined => {
          let result: T | undefined;
          stmt.get(...params).then((r) => {
            result = r as T | undefined;
          }).catch(console.error);
          return result;
        },
        all: <T = DbRow>(...params: DbParams): T[] => {
          let result: T[] = [];
          stmt.all(...params).then((r) => {
            result = r as T[];
          }).catch(console.error);
          return result;
        }
      };
    },
    exec: (sql: string) => {
      // Queue the exec for later
      db.execute(sql).catch(console.error);
    },
    transaction: <T>(fn: TransactionFunction<T>) => fn
  };
}

export function createDbAdapter(
  db: SyncDatabase | AsyncDatabase, 
  isAsync: boolean = false
): DbAdapter {
  if (isAsync) {
    return createAsyncAdapter(db as AsyncDatabase);
  } else {
    return createSyncAdapter(db as SyncDatabase);
  }
}