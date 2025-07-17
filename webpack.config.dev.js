const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: "development",
  entry: "./test/main.ts",
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
  devServer: {
    // static: path.join(__dirname, "test"),
    static: {
      directory: path.join(__dirname, "public"), // 指定你的静态资源目录，例如 'public' 或 'dist'
      publicPath: "/public/",
      serveIndex: true,
    },
    compress: true,
    port: 9000,
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
  plugins: [
    new HtmlWebpackPlugin({
      template: "./test/index.html", // 指向你的HTML模板文件
      filename: "index.html", // 输出的文件名
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/draco3dgltf/*.wasm',
          to: '[name][ext]' // 保持原文件名
        },
      ]
    })
  ],
};
