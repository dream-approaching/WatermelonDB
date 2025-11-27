declare module '@ohos.data.relationalStore' {
  export enum SecurityLevel {
    S1,
    S2,
    S3,
  }

  export enum ColumnType {
    TYPE_NULL,
    TYPE_INTEGER,
    TYPE_FLOAT,
    TYPE_STRING,
    TYPE_BLOB,
  }

  export type ValueType = number | string | null | boolean | Uint8Array;

  export interface StoreConfig {
    name: string;
    securityLevel?: SecurityLevel;
  }

  export interface ResultSet {
    rowCount: number;
    columnCount: number;
    goToFirstRow(): boolean;
    goToNextRow(): boolean;
    getColumnIndex(name: string): number;
    getColumnName(index: number): string;
    getColumnType(index: number): ColumnType;
    getLong(index: number): number;
    getDouble(index: number): number;
    getString(index: number): string;
    getBlob(index: number): Uint8Array;
    close(): void;
  }

  export interface RdbStore {
    executeSql(sql: string, args?: ValueType[]): Promise<void>;
    querySql(sql: string, args?: ValueType[]): Promise<ResultSet>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    close(): Promise<void>;
  }

  export function getRdbStore(
    context: any,
    config: StoreConfig,
    callback: (err: Error | undefined, store: RdbStore) => void
  ): void;
}

