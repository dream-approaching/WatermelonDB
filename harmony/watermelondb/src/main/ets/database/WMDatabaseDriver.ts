import type common from '@ohos.app.ability.common';
import { WMDatabase } from './WMDatabase';
import { MigrationSet, Schema } from '../utils/Schema';
import { MigrationNeededError, SchemaNeededError } from '../utils/Errors';
import { arrayContains, currentRowToObject, QueryArg } from '../utils/DatabaseUtils';
import { relationalStore } from '@kit.ArkData';

type CacheMap = Map<string, Set<string>>;

type SchemaCompatibility =
  | { type: 'compatible' }
  | { type: 'needsSetup' }
  | { type: 'needsMigration'; fromVersion: number };

export interface DriverContext {
  context: common.Context;
  databaseName: string;
  unsafeNativeReuse: boolean;
}

export class WMDatabaseDriver {
  private readonly database: WMDatabase;
  private readonly cachedRecords: CacheMap = new Map();
  private localStorageCache: Map<string, string | null> = new Map();

  private constructor(options: DriverContext) {
    this.database = new WMDatabase({
      context: options.context,
      name: options.databaseName,
      unsafeNativeReuse: options.unsafeNativeReuse,
    });
  }

  static async createWithSchemaVersion(
    context: DriverContext,
    schemaVersion: number
  ): Promise<WMDatabaseDriver> {
    const driver = new WMDatabaseDriver(context);
    const compatibility = await driver.isCompatible(schemaVersion);
    switch (compatibility.type) {
      case 'compatible':
        await driver.refreshLocalStorageCache();
        return driver;
      case 'needsSetup':
        throw new SchemaNeededError();
      case 'needsMigration':
        throw new MigrationNeededError(compatibility.fromVersion);
      default:
        throw new SchemaNeededError();
    }
  }

  static async createWithSchema(
    context: DriverContext,
    schema: Schema
  ): Promise<WMDatabaseDriver> {
    const driver = new WMDatabaseDriver(context);
    await driver.unsafeResetDatabase(schema);
    await driver.refreshLocalStorageCache();
    return driver;
  }

  static async createWithMigrations(
    context: DriverContext,
    migrations: MigrationSet
  ): Promise<WMDatabaseDriver> {
    const driver = new WMDatabaseDriver(context);
    await driver.migrate(migrations);
    await driver.refreshLocalStorageCache();
    return driver;
  }

  async find(table: string, id: string): Promise<Record<string, unknown> | string | null> {
    if (this.isCached(table, id)) {
      return id;
    }
    const queryResult = await this.database.rawQuery(`select * from \`${table}\` where id == ? limit 1`, [id]);
    try {
      if (!queryResult.goToFirstRow()) {
        return null;
      }
      this.markAsCached(table, id);
      return currentRowToObject(queryResult);
    } finally {
      queryResult.close();
    }
  }

  async cachedQuery(
    table: string,
    query: string,
    args: QueryArg[]
  ): Promise<Array<string | Record<string, unknown>>> {
    const resultArray: Array<string | Record<string, unknown>> = [];
    const cursor = await this.database.rawQuery(query, args);
    try {
      if (cursor.rowCount <= 0) {
        return resultArray;
      }
      const columns = this.collectColumns(cursor);
      if (!arrayContains(columns, 'id')) {
        return resultArray;
      }
      const idIndex = cursor.getColumnIndex('id');
      while (cursor.goToNextRow()) {
        const id = cursor.getString(idIndex);
        if (this.isCached(table, id)) {
          resultArray.push(id);
        } else {
          this.markAsCached(table, id);
          resultArray.push(currentRowToObject(cursor));
        }
      }
      return resultArray;
    } finally {
      cursor.close();
    }
  }

  async queryIds(query: string, args: QueryArg[]): Promise<string[]> {
    const ids: string[] = [];
    const cursor = await this.database.rawQuery(query, args);
    try {
      if (cursor.rowCount <= 0) {
        return ids;
      }
      const idIndex = cursor.getColumnIndex('id');
      while (cursor.goToNextRow()) {
        ids.push(cursor.getString(idIndex));
      }
      return ids;
    } finally {
      cursor.close();
    }
  }

  async unsafeQueryRaw(query: string, args: QueryArg[]): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = [];
    const cursor = await this.database.rawQuery(query, args);
    try {
      while (cursor.goToNextRow()) {
        rows.push(currentRowToObject(cursor));
      }
      return rows;
    } finally {
      cursor.close();
    }
  }

  async count(query: string, args: QueryArg[]): Promise<number> {
    return this.database.count(query, args);
  }

  async getLocal(key: string): Promise<string | null> {
    const value = await this.database.getFromLocalStorage(key);
    this.localStorageCache.set(key, value);
    return value;
  }

  async batch(operations: Array<[number, string, string, QueryArg[][]]>): Promise<void> {
    const newIds: Array<{ table: string; id: string }> = [];
    const removedIds: Array<{ table: string; id: string }> = [];
    let localStorageTouched = false;

    await this.database.transaction(async () => {
      for (const operation of operations) {
        const cacheBehavior = operation[0];
        const table = cacheBehavior !== 0 ? operation[1] : '';
        const sql = operation[2];
        const argBatches = operation[3];
        for (const batchArgs of argBatches) {
          await this.database.execute(sql, batchArgs);
          if (table === 'local_storage') {
            localStorageTouched = true;
          }
          if (cacheBehavior === 0) {
            continue;
          }
          const id = String(batchArgs[0]);
          if (cacheBehavior === 1) {
            newIds.push({ table, id });
          } else if (cacheBehavior === -1) {
            removedIds.push({ table, id });
          }
        }
      }
    });

    for (const entry of newIds) {
      this.markAsCached(entry.table, entry.id);
    }
    for (const entry of removedIds) {
      this.removeFromCache(entry.table, entry.id);
    }
    if (localStorageTouched) {
      await this.refreshLocalStorageCache();
    }
  }

  async unsafeResetDatabase(schema: Schema): Promise<void> {
    await this.database.unsafeDestroyEverything();
    await this.database.transaction(async () => {
      await this.database.unsafeExecuteStatements(schema.sql);
      await this.database.setUserVersion(schema.version);
    });
    this.cachedRecords.clear();
  }

  async migrate(migrations: MigrationSet): Promise<void> {
    const databaseVersion = await this.database.getUserVersion();
    if (databaseVersion !== migrations.from) {
      throw new Error(
        `Incompatible migration set applied. DB: ${databaseVersion}, migration: ${migrations.from}`
      );
    }
    await this.database.transaction(async () => {
      await this.database.unsafeExecuteStatements(migrations.sql);
      await this.database.setUserVersion(migrations.to);
    });
  }

  async close(): Promise<void> {
    await this.database.close();
  }

  private async isCompatible(schemaVersion: number): Promise<SchemaCompatibility> {
    const databaseVersion = await this.database.getUserVersion();
    if (databaseVersion === schemaVersion) {
      return { type: 'compatible' };
    }
    if (databaseVersion === 0) {
      return { type: 'needsSetup' };
    }
    if (databaseVersion < schemaVersion) {
      return { type: 'needsMigration', fromVersion: databaseVersion };
    }
    return { type: 'needsSetup' };
  }

  private collectColumns(cursor: relationalStore.ResultSet): string[] {
    const names: string[] = [];
    const columnCount = cursor.columnCount;
    for (let index = 0; index < columnCount; index += 1) {
      names.push(cursor.getColumnName(index));
    }
    return names;
  }

  private markAsCached(table: string, id: string): void {
    const cache = this.cachedRecords.get(table) ?? new Set<string>();
    cache.add(id);
    this.cachedRecords.set(table, cache);
  }

  private async refreshLocalStorageCache(): Promise<void> {
    const cache = new Map<string, string | null>();
    const cursor = await this.database.rawQuery('select key, value from local_storage', []);
    try {
      if (!cursor.goToFirstRow()) {
        this.localStorageCache = cache;
        return;
      }
      do {
        const keyIndex = cursor.getColumnIndex('key');
        const valueIndex = cursor.getColumnIndex('value');
        const key = cursor.getString(keyIndex);
        const value = cursor.getString(valueIndex);
        cache.set(key, value);
      } while (cursor.goToNextRow());
      this.localStorageCache = cache;
    } finally {
      cursor.close();
    }
  }

  getLocalFromCache(key: string): string | null {
    return this.localStorageCache.get(key) ?? null;
  }

  private isCached(table: string, id: string): boolean {
    const cache = this.cachedRecords.get(table);
    return cache?.has(id) ?? false;
  }

  private removeFromCache(table: string, id: string): void {
    const cache = this.cachedRecords.get(table);
    if (cache) {
      cache.delete(id);
      this.cachedRecords.set(table, cache);
    }
  }
}

