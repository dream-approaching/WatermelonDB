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
    // if (this.connections.has(tag)) {
    //   throw new Error(`A driver with tag ${tag} already set up`);
    // }

    // try {
    //   const driver = await WMDatabaseDriver.createWithSchemaVersion(
    //     this.createDriverContext(databaseName, unsafeNativeReuse),
    //     schemaVersion
    //   );
    //   await this.connectDriver(tag, driver);
    //   return { code: 'ok' };
    // } catch (error) {
    //   if (error instanceof Error && error.name === 'SchemaNeededError') {
    //     this.connections.set(tag, { type: 'waiting', queue: [] });
    //     return { code: 'schema_needed' };
    //   }
    //   if (error instanceof Error && error.name === 'MigrationNeededError') {
    //     this.connections.set(tag, { type: 'waiting', queue: [] });
    //     const migrationError = error as { databaseVersion?: number };
    //     return { code: 'migrations_needed', databaseVersion: migrationError.databaseVersion ?? 0 };
    //   }
    //   throw error;
    // }
    console.log('watermelondbConsoleLogger initialize:');
    return { code: 'ok' };
  }

  async setUpWithSchema(
    tag: number,
    databaseName: string,
    schema: string,
    schemaVersion: number,
    unsafeNativeReuse: boolean
  ): Promise<boolean> {
    // const driver = await WMDatabaseDriver.createWithSchema(
    //   this.createDriverContext(databaseName, unsafeNativeReuse),
    //   new Schema(schemaVersion, schema)
    // );
    // await this.connectDriver(tag, driver);
    // return true;
    console.log('watermelondbConsoleLogger setUpWithSchema:');
    return false;
  }

  async setUpWithMigrations(
    tag: number,
    databaseName: string,
    migrations: string,
    fromVersion: number,
    toVersion: number,
    unsafeNativeReuse: boolean
  ): Promise<boolean> {
      // const driver = await WMDatabaseDriver.createWithMigrations(
      //   this.createDriverContext(databaseName, unsafeNativeReuse),
      //   new MigrationSet(fromVersion, toVersion, migrations)
      // );
      // await this.connectDriver(tag, driver);
      // return true;
      console.log('watermelondbConsoleLogger setUpWithMigrations:');
      return false;
  }

  async find(tag: number, table: string, id: string): Promise<unknown> {
    // return this.withDriver(tag, 'find', (driver) => driver.find(table, id));
    console.log('watermelondbConsoleLogger find:');
    return null;
  }

  async query(tag: number, table: string, query: string, args: unknown[]): Promise<unknown> {
    // return this.withDriver(tag, 'query', (driver) => driver.cachedQuery(table, query, args as any));
    console.log('watermelondbConsoleLogger query:');
    return null;
  }

  async queryIds(tag: number, query: string, args: unknown[]): Promise<string[]> {
    // return this.withDriver(tag, 'queryIds', (driver) => driver.queryIds(query, args as any));
    console.log('watermelondbConsoleLogger queryIds:');
    return [];
  }

  async unsafeQueryRaw(tag: number, query: string, args: unknown[]): Promise<unknown[]> {
    // return this.withDriver(tag, 'unsafeQueryRaw', (driver) => driver.unsafeQueryRaw(query, args as any));
    console.log('watermelondbConsoleLogger unsafeQueryRaw:');
    return [];
  }

  async count(tag: number, query: string, args: unknown[]): Promise<number> {
    // return this.withDriver(tag, 'count', (driver) => driver.count(query, args as any));
    console.log('watermelondbConsoleLogger count:');
    return 0;
  }

  async batch(tag: number, operations: Array<[number, string, string, unknown[][]]>): Promise<boolean> {
    // await this.withDriver(tag, 'batch', (driver) => driver.batch(operations as any));
    console.log('watermelondbConsoleLogger batch:');
    return true;
  }

  async unsafeResetDatabase(tag: number, schema: string, schemaVersion: number): Promise<void> {
    // return this.withDriver(tag, 'unsafeResetDatabase', (driver) =>
    //   driver.unsafeResetDatabase(new Schema(schemaVersion, schema))
    // );
    console.log('watermelondbConsoleLogger unsafeResetDatabase:');
    return;
  }

  async getLocal(tag: number, key: string): Promise<string | null> {
    // return this.withDriver(tag, 'getLocal', (driver) => driver.getLocal(key));
    console.log('watermelondbConsoleLogger getLocal:');
    return null;
  }

  unsafeGetLocalSynchronously(tag: number, key: string): [string, string | null] {
    // const connection = this.connections.get(tag);
    // if (!connection || connection.type !== 'connected') {
    //   return ['error', `No driver with tag ${tag} available`];
    // }
    // return ['result', connection.driver.getLocalFromCache(key)];
    console.log('watermelondbConsoleLogger unsafeGetLocalSynchronously:');
    return ['result', null];
  }

  async provideSyncJson(id: number, json: string): Promise<boolean> {
    // const runtime: any = globalThis;
    // const watermelonJSI = runtime?.WatermelonJSI ?? runtime?.__WatermelonJSI;
    // if (watermelonJSI?.provideSyncJson) {
    //   await watermelonJSI.provideSyncJson(id, json);
    //   return true;
    // }
    // throw new Error('WatermelonJSI not available on Harmony');
    console.log('watermelondbConsoleLogger provideSyncJson:');
    return false;
  }

  getRandomBytes(count: number): number[] {
    // if (count !== 256) {
    //   throw new Error('Expected getRandomBytes to be called with 256');
    // }
    // const random = cryptoFramework.createRandom();
    // const buffer = new ArrayBuffer(count);
    // random.generateRandom(buffer);
    // const view = new Uint8Array(buffer);
    // return Array.from(view);
    console.log('watermelondbConsoleLogger getRandomBytes:');
    return [];
  }

  invalidate(): void {
    console.log('watermelondbConsoleLogger invalidate:');
    // super.invalidate();
    // this.connections.clear();
    // const runtime: any = globalThis;
    // const watermelonJSI = runtime?.WatermelonJSI ?? runtime?.__WatermelonJSI;
    // if (watermelonJSI?.onCatalystInstanceDestroy) {
    //   try {
    //     watermelonJSI.onCatalystInstanceDestroy();
    //   } catch (error) {
    //     hilog.info(0x0000, 'WatermelonDBBridge', `JSI destroy failed: ${error}`);
    //   }
    // }
  }

  onCatalystInstanceDestroy(): void {
    
    console.log('watermelondbConsoleLogger onCatalystInstanceDestroy:');
    // this.invalidate();
  }

  private async withDriver<T>(tag: number, fnName: string, fn: ParamFunction<T>): Promise<T> {
    // const connection = this.connections.get(tag);
    // if (!connection) {
    //   throw new Error(`No driver with tag ${tag} available`);
    // }
    // if (connection.type === 'connected') {
    //   return fn(connection.driver);
    // }
    // return new Promise<T>((resolve, reject) => {
    //   const queueFn = () =>
    //     this.withDriver(tag, fnName, fn)
    //       .then(resolve)
    //       .catch(reject);
    //   const waitingQueue = connection.queue.concat(queueFn);
    //   this.connections.set(tag, { type: 'waiting', queue: waitingQueue });
    // });
    console.log('watermelondbConsoleLogger withDriver:');
    return null as unknown as T;
  }

  private async connectDriver(tag: number, driver: WMDatabaseDriver): Promise<void> {
    // const queue = this.getQueue(tag);
    // this.connections.set(tag, { type: 'connected', driver });
    // queue.forEach((operation) => operation());
    console.log('watermelondbConsoleLogger connectDriver:');
  }

  private getQueue(tag: number): Array<() => void> {
    console.log('watermelondbConsoleLogger getQueue:');
    // const connection = this.connections.get(tag);
    // if (!connection) {
    //   return [];
    // }
    // if (connection.type === 'waiting') {
    //   return connection.queue;
    // }
    // return [];
    return [];
  }

  private createDriverContext(databaseName: string, unsafeNativeReuse: boolean): DriverContext {
    console.log('watermelondbConsoleLogger createDriverContext:');
    // const abilityContext = this.ctx.uiAbilityContext as common.Context;
    // return {
    //   context: abilityContext,
    //   databaseName,
    //   unsafeNativeReuse,
    // };
    return {
      context: null,
      databaseName,
      unsafeNativeReuse,
    };
  }
}

