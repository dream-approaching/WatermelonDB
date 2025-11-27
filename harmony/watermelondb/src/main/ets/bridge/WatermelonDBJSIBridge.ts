import { TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { TM } from '../generated/ts';


export class WatermelonDBJSIBridge extends TurboModule {
  static NAME = TM.WMDatabaseJSIBridge.NAME;

  constructor(readonly ctx: TurboModuleContext) {
    super(ctx);
  }

  getName(): string {
    return WatermelonDBJSIBridge.NAME;
  }

   install(): void {
     console.log('watermelondbConsoleLogger install:');
  }

}

