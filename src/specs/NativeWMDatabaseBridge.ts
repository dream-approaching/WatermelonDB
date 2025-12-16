
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface InitializeResult {
  code: 'ok' | 'schema_needed';
  databaseVersion?: number;
}

export interface BatchOperation {
  cacheBehavior: number;
  table: string | null;
  sql: string;
  args: Array<Array<string | number | boolean | null>>;
}

export interface SqliteArgs {
  sql: string;
  args: Array<string | number | boolean | null>;
}

export interface Spec extends TurboModule {
  initialize: ( tag: number, databaseName: string, schemaVersion: number, unsafeNativeReuse: boolean, ) => Promise<InitializeResult>,
  setUpWithSchema: ( tag: number, databaseName: string, schema: string, schemaVersion: number, unsafeNativeReuse: boolean, ) => Promise<boolean>,
  setUpWithMigrations: ( tag: number, databaseName: string, migrations: string, fromVersion: number, toVersion: number, unsafeNativeReuse: boolean, ) => Promise<boolean>,
  find: (tag: number, table: string, id: string) => Promise<any>,
  query: (tag: number, table: string, sql: string, args: SqliteArgs) => Promise<any>,
  queryIds: (tag: number, sql: string, args: SqliteArgs) => Promise<string[]>,
  unsafeQueryRaw: (tag: number, sql: string, args: SqliteArgs) => Promise<any[]>,
  count: (tag: number, sql: string, args: SqliteArgs) => Promise<number>,
  batch: (tag: number, operations: BatchOperation[]) => Promise<boolean>,
  unsafeResetDatabase: ( tag: number, schema: string, schemaVersion: number, ) => Promise<void>,
  getLocal: (tag: number, key: string) => Promise<string | null>,
  unsafeGetLocalSynchronously: (tag: number, key: string) => Array<string | null>,
  provideSyncJson: (id: number, syncPullResultJson: string) => Promise<boolean>,
  getRandomBytes: (count: number) => number[],
  getRandomIds?: () => string,
};

export default TurboModuleRegistry.getEnforcing<Spec>("WMDatabaseBridge");

