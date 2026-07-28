/** Preset Expo : JSX automatique, TypeScript, et les transformations Metro. */
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
