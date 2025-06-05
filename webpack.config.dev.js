const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./test/main.ts",
  resolve: {
    extensions: [".ts", ".js"],
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
  ],
};
