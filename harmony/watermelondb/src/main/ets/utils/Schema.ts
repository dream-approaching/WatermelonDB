export interface SchemaPayload {
  version: number;
  sql: string;
}

export class Schema implements SchemaPayload {
  readonly version: number;
  readonly sql: string;

  constructor(version: number, sql: string) {
    this.version = version;
    this.sql = sql;
  }
}

export interface MigrationPayload {
  from: number;
  to: number;
  sql: string;
}

export class MigrationSet implements MigrationPayload {
  readonly from: number;
  readonly to: number;
  readonly sql: string;

  constructor(from: number, to: number, sql: string) {
    this.from = from;
    this.to = to;
    this.sql = sql;
  }
}

