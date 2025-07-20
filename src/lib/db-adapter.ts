// Database adapter to handle both sync (better-sqlite3) and async (Turso) operations

interface DbStatement {
  run(...params: any[]): any;
  get(...params: any[]): any;
  all(...params: any[]): any;
}

interface DbAdapter {
  prepare(sql: string): DbStatement;
  exec(sql: string): void;
  transaction(fn: Function): Function;
}

function createSyncAdapter(db: any): DbAdapter {
  return {
    prepare: (sql: string) => db.prepare(sql),
    exec: (sql: string) => db.exec(sql),
    transaction: (fn: Function) => db.transaction(fn)
  };
}

function createAsyncAdapter(db: any): DbAdapter {
  return {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql);
      return {
        run: (...params: any[]) => {
          // For async operations, we need to handle them differently
          // This is a temporary sync wrapper - we'll need to update calling code
          let result: any;
          stmt.run(...params).then((r: any) => result = r);
          return result || { lastInsertRowid: 0, changes: 0 };
        },
        get: (...params: any[]) => {
          let result: any;
          stmt.get(...params).then((r: any) => result = r);
          return result;
        },
        all: (...params: any[]) => {
          let result: any = [];
          stmt.all(...params).then((r: any) => result = r);
          return result;
        }
      };
    },
    exec: (sql: string) => {
      // Queue the exec for later
      db.exec(sql).catch(console.error);
    },
    transaction: (fn: Function) => fn
  };
}

export function createDbAdapter(db: any, isAsync: boolean = false): DbAdapter {
  return isAsync ? createAsyncAdapter(db) : createSyncAdapter(db);
}