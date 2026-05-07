import { Platform, TurboModuleRegistry } from 'react-native';

/** True when the Async Storage native module is registered (New Architecture / TurboModule name used by v3.x). */
export function isRnAsyncStorageLinked(): boolean {
  if (Platform.OS === 'web') return true;
  try {
    return TurboModuleRegistry.get('RNAsyncStorage') != null;
  } catch {
    return false;
  }
}
