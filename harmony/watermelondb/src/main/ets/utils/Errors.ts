export class SchemaNeededError extends Error {
  constructor() {
    super('schema_needed');
    this.name = 'SchemaNeededError';
  }
}

export class MigrationNeededError extends Error {
  readonly databaseVersion: number;

  constructor(databaseVersion: number) {
    super('migrations_needed');
    this.name = 'MigrationNeededError';
    this.databaseVersion = databaseVersion;
  }
}

