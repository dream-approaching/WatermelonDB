import dataRdb from '@ohos.data.relationalStore';
import type common from '@ohos.app.ability.common';
import { SELECT_LOCAL_STORAGE, SELECT_TABLES, dropTable } from './Queries';

type RdbStore = dataRdb.RdbStore;

interface StoreConfig extends dataRdb.StoreConfig {}

export interface WMDatabaseOptions {
  context: common.Context;
  name: string;
  unsafeNativeReuse: boolean;
}

export class WMDatabase {
  private static reusePool: Map<string, Promise<RdbStore>> = new Map();
  private store?: RdbStore;
  private readonly options: WMDatabaseOptions;
  private readonly config: StoreConfig;

  constructor(options: WMDatabaseOptions) {
    this.options = options;
    this.config = {
      name: options.name.endsWith('.db') ? options.name : `${options.name}.db`,
      securityLevel: dataRdb.SecurityLevel.S2,
    };
  }

  private async ensureStore(): Promise<RdbStore> {
    if (this.store) {
      return this.store;
    }
    if (this.options.unsafeNativeReuse) {
      let cached = WMDatabase.reusePool.get(this.config.name);
      if (!cached) {
        cached = this.openStore();
        WMDatabase.reusePool.set(this.config.name, cached);
      }
      this.store = await cached;
      return this.store;
    }
    this.store = await this.openStore();
    return this.store;
  }

  private openStore(): Promise<RdbStore> {
    return new Promise((resolve, reject) => {
      dataRdb.getRdbStore(this.options.context, this.config, (err, store) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(store);
      });
    });
  }

  async close(): Promise<void> {
    if (!this.store) {
      return;
    }
    await this.store.close();
    this.store = undefined;
  }

  async setUserVersion(version: number): Promise<void> {
    const store = await this.ensureStore();
    await store.executeSql(`pragma user_version=${version}`);
  }

  async getUserVersion(): Promise<number> {
    const store = await this.ensureStore();
    const result = await store.querySql('pragma user_version');
    if (!result || result.rowCount === 0) {
      return 0;
    }
    const row = result.goToFirstRow() ? result.getDouble(0) : 0;
    result.close();
    return row;
  }

  async unsafeExecuteStatements(statements: string): Promise<void> {
    await this.transaction(async () => {
      for (const statement of statements.split(';')) {
        if (statement.trim().length === 0) {
          continue;
        }
        await this.execute(statement);
      }
    });
  }

  async execute(sql: string, args: Array<number | string | null | boolean> = []): Promise<void> {
    const store = await this.ensureStore();
    await store.executeSql(sql, args as unknown as dataRdb.ValueType[]);
  }

  async rawQuery(sql: string, args: Array<number | string | null | boolean> = []): Promise<dataRdb.ResultSet> {
    const store = await this.ensureStore();
    return store.querySql(sql, args as unknown as dataRdb.ValueType[]);
  }

  async count(sql: string, args: Array<number | string | null | boolean> = []): Promise<number> {
    const result = await this.rawQuery(sql, args);
    const hasRow = result.goToFirstRow();
    if (!hasRow) {
      result.close();
      return 0;
    }
    const countIndex = result.getColumnIndex('count');
    const value = countIndex >= 0 ? result.getLong(countIndex) : 0;
    result.close();
    return value;
  }

  async getFromLocalStorage(key: string): Promise<string | null> {
    const result = await this.rawQuery(SELECT_LOCAL_STORAGE, [key]);
    const hasRow = result.goToFirstRow();
    if (!hasRow) {
      result.close();
      return null;
    }
    const value = result.getString(0);
    result.close();
    return value;
  }

  async unsafeDestroyEverything(): Promise<void> {
    await this.transaction(async () => {
      const result = await this.rawQuery(SELECT_TABLES);
      const tableNames: string[] = [];
      while (result.goToNextRow()) {
        const columnIndex = result.getColumnIndex('name');
        if (columnIndex >= 0) {
          tableNames.push(result.getString(columnIndex));
        }
      }
      result.close();
      for (const table of tableNames) {
        await this.execute(dropTable(table));
      }
      await this.execute('pragma writable_schema=1');
      await this.execute("delete from sqlite_master where type in ('table','index','trigger')");
      await this.execute('pragma user_version=0');
      await this.execute('pragma writable_schema=0');
    });
  }

  async transaction(fn: () => Promise<void> | void): Promise<void> {
    const store = await this.ensureStore();
    await store.beginTransaction();
    try {
      await fn();
      await store.commit();
    } catch (error) {
      // await store.rollback();
      throw error;
    }
  }
}

