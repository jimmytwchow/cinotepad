const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackFavicons = require("webpack-favicons");
const WorkboxPlugin = require("workbox-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "polythene-theme": path.resolve(__dirname, "src/custom-theme.ts"),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({ title: "CINotepad" }),
    new WebpackFavicons({
      src: "src/favicon.svg",
      appName: "CINotepad",
      background: "#ff007f",
      theme_color: "#ff007f",
      display: "standalone",
      icons: {
        android: { offset: 15, background: true },
        appleIcon: { offset: 15, background: true },
        appleStartup: { offset: 15, background: true },
        favicons: true,
        windows: { offset: 15, background: true },
      },
    }),
    new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    }),
  ],
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
};
