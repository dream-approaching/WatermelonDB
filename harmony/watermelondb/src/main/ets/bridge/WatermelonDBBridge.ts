import { TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import cryptoFramework from '@ohos.security.cryptoFramework';
import hilog from '@ohos.hilog';
import type common from '@ohos.app.ability.common';
import { WMDatabaseDriver, type DriverContext } from '../database/WMDatabaseDriver';
import { Schema, MigrationSet } from '../utils/Schema';
import { TM } from '../generated/ts';

type Connection =
  | { type: 'connected'; driver: WMDatabaseDriver }
  | { type: 'waiting'; queue: Array<() => void> };

type ParamFunction<T> = (driver: WMDatabaseDriver) => Promise<T>;

interface InitializeResult {
  code: 'ok' | 'schema_needed' | 'migrations_needed';
  databaseVersion?: number;
}

export class WatermelonDBBridge extends TurboModule {
  static NAME = TM.WMDatabaseBridge.NAME;
  private readonly connections: Map<number, Connection> = new Map();

  constructor(readonly ctx: TurboModuleContext) {
    super(ctx);
  }

  getName(): string {
    return WatermelonDBBridge.NAME;
  }

  async initialize(
    tag: number,
    databaseName: string,
    schemaVersion: number,
    unsafeNativeReuse: boolean
  ): Promise<InitializeResult> {
    if (this.connections.has(tag)) {
      throw new Error(`A driver with tag ${tag} already set up`);
    }

    try {
      const driver = await WMDatabaseDriver.createWithSchemaVersion(
        this.createDriverContext(databaseName, unsafeNativeReuse),
        schemaVersion
      );
      await this.connectDriver(tag, driver);
      return { code: 'ok' };
    } catch (error) {
      if (error instanceof Error && error.name === 'SchemaNeededError') {
        this.connections.set(tag, { type: 'waiting', queue: [] });
        return { code: 'schema_needed' };
      }
      if (error instanceof Error && error.name === 'MigrationNeededError') {
        this.connections.set(tag, { type: 'waiting', queue: [] });
        const migrationError = error as { databaseVersion?: number };
        return { code: 'migrations_needed', databaseVersion: migrationError.databaseVersion ?? 0 };
      }
      throw error;
    }
  }

  async setUpWithSchema(
    tag: number,
    databaseName: string,
    schema: string,
    schemaVersion: number,
    unsafeNativeReuse: boolean
  ): Promise<boolean> {
    console.log('watermelondbConsoleLogger setUpWithSchema:');
    const driver = await WMDatabaseDriver.createWithSchema(
      this.createDriverContext(databaseName, unsafeNativeReuse),
      new Schema(schemaVersion, schema)
    );
    await this.connectDriver(tag, driver);
    return true;
  }

  async setUpWithMigrations(
    tag: number,
    databaseName: string,
    migrations: string,
    fromVersion: number,
    toVersion: number,
    unsafeNativeReuse: boolean
  ): Promise<boolean> {
      const driver = await WMDatabaseDriver.createWithMigrations(
        this.createDriverContext(databaseName, unsafeNativeReuse),
        new MigrationSet(fromVersion, toVersion, migrations)
      );
      await this.connectDriver(tag, driver);
      return true;
  }

  async find(tag: number, table: string, id: string): Promise<unknown> {
    console.log('watermelondbConsoleLogger find:');
    return this.withDriver(tag, 'find', (driver) => driver.find(table, id));
  }

  async query(tag: number, table: string, query: string, args: unknown[]): Promise<unknown> {
    console.log('watermelondbConsoleLogger query:');
    return this.withDriver(tag, 'query', (driver) => driver.cachedQuery(table, query, args as any));
  }

  async queryIds(tag: number, query: string, args: unknown[]): Promise<string[]> {
    console.log('watermelondbConsoleLogger queryIds:');
    return this.withDriver(tag, 'queryIds', (driver) => driver.queryIds(query, args as any));
  }

  async unsafeQueryRaw(tag: number, query: string, args: unknown[]): Promise<unknown[]> {
    console.log('watermelondbConsoleLogger unsafeQueryRaw:');
    return this.withDriver(tag, 'unsafeQueryRaw', (driver) => driver.unsafeQueryRaw(query, args as any));
  }

  async count(tag: number, query: string, args: unknown[]): Promise<number> {
    console.log('watermelondbConsoleLogger count:');
    return this.withDriver(tag, 'count', (driver) => driver.count(query, args as any));
  }

  async batch(tag: number, operations: Array<[number, string, string, unknown[][]]>): Promise<boolean> {
    console.log('watermelondbConsoleLogger batch:');
    await this.withDriver(tag, 'batch', (driver) => driver.batch(operations as any));
    return true;
  }

  async unsafeResetDatabase(tag: number, schema: string, schemaVersion: number): Promise<void> {
    console.log('watermelondbConsoleLogger unsafeResetDatabase:');
    return this.withDriver(tag, 'unsafeResetDatabase', (driver) =>
      driver.unsafeResetDatabase(new Schema(schemaVersion, schema))
    );
  }

  async getLocal(tag: number, key: string): Promise<string | null> {
    console.log('watermelondbConsoleLogger getLocal:');
    return this.withDriver(tag, 'getLocal', (driver) => driver.getLocal(key));
  }

  unsafeGetLocalSynchronously(tag: number, key: string): [string, string | null] {
    console.log('watermelondbConsoleLogger unsafeGetLocalSynchronously:');
    return ['result', null];
  }

  async provideSyncJson(id: number, json: string): Promise<boolean> {
    console.log('watermelondbConsoleLogger provideSyncJson:');
    const runtime: any = globalThis;
    const watermelonJSI = runtime?.WatermelonJSI ?? runtime?.__WatermelonJSI;
    if (watermelonJSI?.provideSyncJson) {
      await watermelonJSI.provideSyncJson(id, json);
      return true;
    }
    throw new Error('WatermelonJSI not available on Harmony');
  }

  getRandomBytes(count: number): number[] {
    console.log('watermelondbConsoleLogger getRandomBytes:');
    if (count !== 256) {
      throw new Error('Expected getRandomBytes to be called with 256');
    }
    const random = cryptoFramework.createRandom();
    const randomValues = random.generateRandomSync(count);
    return Array.from(randomValues.data);
  }

  getRandomIds(): string {
    console.log('watermelondbConsoleLogger getRandomIds:');
    const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const batchSize = 64;
    const idLength = 16;
    // Total bytes needed: 64 IDs * 16 chars each = 1024 random bytes
    const totalBytesNeeded = batchSize * idLength;

    const random = cryptoFramework.createRandom();
    // Use synchronous method for better performance in sync context
    const randomDataBlob = random.generateRandomSync(totalBytesNeeded);
    const randomBytes = Array.from(randomDataBlob.data);
    
    const ids: string[] = [];
    let byteIndex = 0;

    // Generate 64 IDs, each 16 characters long
    for (let i = 0; i < batchSize; i++) {
      let id = '';
      
      // Generate 16 characters from the alphabet
      for (let j = 0; j < idLength; j++) {
        // Use modulo to map byte value (0-255) to alphabet index (0-61)
        const byteValue = (randomBytes[byteIndex] as number) % 62;
        id += alphabet[byteValue];
        byteIndex++;
      }
      
      ids.push(id);
    }

    // Return comma-separated string (64 IDs joined by commas)
    const result = ids.join(',');
    console.log('watermelondbConsoleLogger getRandomIds result length:', result.length);
    return result;
  }

  invalidate(): void {
    console.log('watermelondbConsoleLogger invalidate:');
    // super.invalidate();
    this.connections.clear();
    const runtime: any = globalThis;
    const watermelonJSI = runtime?.WatermelonJSI ?? runtime?.__WatermelonJSI;
    if (watermelonJSI?.onCatalystInstanceDestroy) {
      try {
        watermelonJSI.onCatalystInstanceDestroy();
      } catch (error) {
        hilog.info(0x0000, 'WatermelonDBBridge', `JSI destroy failed: ${error}`);
      }
    }
  }

  onCatalystInstanceDestroy(): void {
    
    console.log('watermelondbConsoleLogger onCatalystInstanceDestroy:');
    this.invalidate();
  }

  private async withDriver<T>(tag: number, fnName: string, fn: ParamFunction<T>): Promise<T> {
    console.log('watermelondbConsoleLogger withDriver:');
    const connection = this.connections.get(tag);
    if (!connection) {
      throw new Error(`No driver with tag ${tag} available`);
    }
    if (connection.type === 'connected') {
      return fn(connection.driver);
    }
    return new Promise<T>((resolve, reject) => {
      const queueFn = () =>
        this.withDriver(tag, fnName, fn)
          .then(resolve)
          .catch(reject);
      const waitingQueue = connection.queue.concat(queueFn);
      this.connections.set(tag, { type: 'waiting', queue: waitingQueue });
    });
  }

  private async connectDriver(tag: number, driver: WMDatabaseDriver): Promise<void> {
    console.log('watermelondbConsoleLogger connectDriver:');
    const queue = this.getQueue(tag);
    this.connections.set(tag, { type: 'connected', driver });
    queue.forEach((operation) => operation());
  }

  private getQueue(tag: number): Array<() => void> {
    console.log('watermelondbConsoleLogger getQueue:');
    const connection = this.connections.get(tag);
    if (!connection) {
      return [];
    }
    if (connection.type === 'waiting') {
      return connection.queue;
    }
    return [];
  }

  private createDriverContext(databaseName: string, unsafeNativeReuse: boolean): DriverContext {
    console.log('watermelondbConsoleLogger createDriverContext:');
    const abilityContext = this.ctx.uiAbilityContext as common.Context;
    return {
      context: abilityContext,
      databaseName,
      unsafeNativeReuse,
    };
  }
}

