const path = require("path");
// const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: "production",
  entry: "./src/ThingOrigin.ts",
  performance: {
    hints: false,
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "ThingOrigin2.0.js",
    // library: 'ThingOrigin',
    // libraryTarget: 'umd',
    // globalObject: 'this'
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      three: path.resolve(__dirname, "node_modules/three"),
    },
    fallback: {
      "path": false,
      "fs": false
    }
  },
  stats: {
    errorDetails: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false, // 禁用提取注释到单独文件
        terserOptions: {
          format: {
            comments: /中国科学院沈阳自动化研究所/, // 保留特定注释
          },
        },
      }),
    ],
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: `/*! 中国科学院沈阳自动化研究所-3D引擎 by 李林\n@license MIT ${new Date().toLocaleString()} */`,
      raw: true, // 如果你的banner是原始字符串，而不是需要被eval的JavaScript，设置为true
      entryOnly: false, // 默认为false，表示在所有输出的chunk中插入banner，如果设为true，则只在入口c
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/draco3dgltf/*.wasm',
          to: '[name][ext]' // 保持原文件名
        },
      ]
    })
    // new UglifyJsPlugin(),
  ],
};
