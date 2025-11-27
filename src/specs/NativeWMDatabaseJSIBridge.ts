import { TurboModuleRegistry, TurboModule } from "react-native";


export interface Spec extends TurboModule {
  install?: () => void,
};

export default TurboModuleRegistry.getEnforcing<Spec>("WMDatabaseJSIBridge");

