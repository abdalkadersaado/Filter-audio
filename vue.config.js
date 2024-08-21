const { defineConfig } = require('@vue/cli-service');
const path = require('path');

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    https: {
      key: "./certs/key.pem",
      cert: "./certs/cert.pem",
    },
    port: 9000,
    host: "localhost",
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  configureWebpack: {
    experiments: {
      asyncWebAssembly: true,
      syncWebAssembly: true,
    },
    module: {
      rules: [
        {
          test: /\.wasm$/,
          type: 'webassembly/async',
        },
      ],
    },
    resolve: {
      alias: {
        '@ffmpeg/ffmpeg': path.resolve(__dirname, 'node_modules/@ffmpeg/ffmpeg'),
      },
    },
  },
});
