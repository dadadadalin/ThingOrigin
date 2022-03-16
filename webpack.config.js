const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const webpack = require("webpack");

module.exports = function (env, argv) {
    const config = {
        entry: {
            main: "./src/main.ts",
        }, //已多次提及的唯一入口文件
        output: {
            path: path.resolve(__dirname, "./public"), //打包后的文件存放的地方
            filename: "js/thingorigin.js", //打包后输出文件的文件名
        },
        resolve: {
            // Add `.ts` and `.tsx` as a resolvable extension
            extensions: [".ts", ".tsx", ".js", ".json"],
        },
        module: {
            rules: [
                {
                    test: /\.(jsx|js|ts)$/,
                    use: {
                        loader: "babel-loader",
                    },
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: "style-loader",
                        },
                        {
                            loader: "css-loader",
                        },
                        {
                            loader: "postcss-loader",
                        },
                    ],
                },
                {
                    test: /\.less$/,
                    use: [
                        {
                            loader: "style-loader",
                        },
                        {
                            loader: "css-loader",
                        },
                        {
                            loader: "postcss-loader",
                        },
                        {
                            loader: "less-loader",
                        },
                    ],
                },
                {
                    test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
                    use: {
                        loader: "url-loader",
                        options: {
                            limit: 1000,
                            name: "images/[name].[hash:7].[ext]",
                        },
                    },
                },
                {
                    test: /\.(eot|woff|ttf|woff2)(\?|$)/,
                    use: {
                        loader: "file-loader",
                        options: {
                            limit: 1000,
                            name: "images/[name].[hash:7].[ext]",
                        },
                    },
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                title: "沈自所-3D引擎", //html的title
                filename: "./index.html", //打包好后，新建的html名字为first.html
                template: "./src/page/index.html", //以src下面的index.html为模板去创建新的html文件
                chunks: ["main"],
                //上线时减小html代码的规格,压缩代码
                minify: {
                    //删除空格
                    collapseWhitespace: true,
                    //删除html的注释
                    removeComments: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    useShortDoctype: true,
                },
            }),
        ],
    };

    //开发环境
    if (argv.env.development) {
        //以下是服务环境配置
        config.devServer = {
            contentBase: "./public", //本地服务器所加载的页面所在的目录
            before(app) {
                app.use(bodyParser.json({ limit: "50mb" }));
                app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));

                /*app.get("/get", function(req, res) {
                    console.log("获取请求");
                    res.json({ custom: 'response' });
                });*/

                //获取post请求
                app.post("/", function (req, res) {
                    //接收前台POST过来的base64
                    var imgData = req.body.imgData;
                    //过滤data:URL
                    var base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
                    var dataBuffer = new Buffer(base64Data, "base64");

                    console.log(req.body.path);
                    fs.writeFile(path.resolve(__dirname, "../public/" + req.body.path + "filter.png"), dataBuffer, function (err) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send("保存成功！");
                        }
                    });
                });
            },
            inline: true, //实时刷新
            open: true,
            //host: "192.168.0.232"
        };

        config.devtool = "cheap-module-eval-source-map";
    }

    //生产环境
    else if (argv.env.production) {
        config.entry.main = "./src/ThingOrigin.ts";
        config.plugins.push(new webpack.BannerPlugin("中国科学院沈阳自动化研究所-3D引擎 by 李林")); //文件自动添加内容
        config.plugins.push(new UglifyJsPlugin()); //js 压缩混淆代码
        //config.plugins.push(new ExtractTextPlugin("css/index.css"));//css文件配置 如果需要单独提出css
    }

    return config;
};
