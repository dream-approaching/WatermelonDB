import { RNPackage } from '@rnoh/react-native-openharmony/ts'
import { TurboModulesFactory, TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts'
import { TM } from "../generated/ts"
import { WatermelonDBBridge } from './WatermelonDBBridge'
import { WatermelonDBJSIBridge } from './WatermelonDBJSIBridge'

class WatermelonDBTurboModuleFactory extends TurboModulesFactory {
  ctx: TurboModuleContext;
  constructor(ctx: TurboModuleContext) {
    super(ctx);
    this.ctx = ctx;
  }
  createTurboModule(name: string): TurboModule | null {
    if (name === TM.WMDatabaseBridge.NAME) {
      return new WatermelonDBBridge(this.ctx);
    }
    if (name === TM.WMDatabaseJSIBridge.NAME) {
      return new WatermelonDBJSIBridge(this.ctx);
    }
    return null;
  }

  hasTurboModule(name: string): boolean {
    return name === TM.WMDatabaseBridge.NAME || name === TM.WMDatabaseJSIBridge.NAME;
  }
}

export class WatermelonDBPackage extends RNPackage {
  createTurboModulesFactory(ctx: TurboModuleContext): TurboModulesFactory {
    return new WatermelonDBTurboModuleFactory(ctx);
  }
}

