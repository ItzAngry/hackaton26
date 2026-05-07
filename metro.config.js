const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const parentResolveRequest = config.resolver.resolveRequest;

/**
 * react-native-svg ships elements.web.js with `import ... from './web/utils'`.
 * Metro does not apply Node-style directory resolution there, so it never finds
 * web/utils/index.js and web builds fail. Point those imports at explicit files.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath?.replace(/\\/g, '/') ?? '';

  if (origin.endsWith('react-native-svg/lib/module/elements.web.js')) {
    const base = path.dirname(context.originModulePath);
    if (moduleName === './web/utils') {
      return {
        filePath: path.join(base, 'web', 'utils', 'index.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === './web/WebShape') {
      return {
        filePath: path.join(base, 'web', 'WebShape.js'),
        type: 'sourceFile',
      };
    }
  }

  if (parentResolveRequest) {
    return parentResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
