module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          /** Fixes web: `Cannot use 'import.meta' outside a module` when deps emit import.meta */
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      // Must stay last — required for react-native-reanimated worklets on native.
      'react-native-reanimated/plugin',
    ],
  };
};
