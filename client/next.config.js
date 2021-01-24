/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const withPlugins = require("next-compose-plugins");
const withCustomBabelConfig = require("next-plugin-custom-babel-config");
const withTranspileModules = require("next-transpile-modules");

function withCustomWebpack(config = {}) {
  const { webpack } = config;

  config.webpack = (config, ...rest) => {
    const babelRule = config.module.rules.find((rule) =>
      rule.use && Array.isArray(rule.use)
        ? rule.use.find((u) => u.loader === "next-babel-loader")
        : rule.use.loader === "next-babel-loader"
    );
    if (babelRule) {
      babelRule.include.push(path.resolve("../"));
    }

    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg)$/i,
      loader: "file-loader",
      options: {
        outputPath: "../public/assets/", // if you don't use ../ it will put it inside ".next" folder by default
      },
    });

    config.module.rules.push({
      test: /react-spring/,
      sideEffects: true,
    });

    return webpack(config, ...rest);
  };

  return config;
}

const plugins = [
  [withTranspileModules, { transpileModules: ["@kotan"] }],
  [
    withCustomBabelConfig,
    { babelConfigFile: path.resolve("../babel.config.js") },
  ],
  [withCustomWebpack],
];

const config = {
  async rewrites() {
    return [];
  },
};

module.exports = withPlugins(plugins, config);
