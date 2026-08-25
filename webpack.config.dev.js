const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const tsLoaderOpts = { transpileOnly: true }

function sceneApiBaseFromEnv(env) {
    const isHttps = env && env.variant === 'https'
    return isHttps ? 'https://124.70.30.193:8444' : 'http://124.70.30.193:8082'
}
module.exports = (env = {}) => {
    const sceneApiBase = sceneApiBaseFromEnv(env)
    return {
        mode: 'development',
        entry: './test/main.ts',
        resolve: {
            extensions: ['.ts', '.js'],
            alias: {
                'three/webgpu$': path.resolve(__dirname, 'node_modules/three/build/three.webgpu.js'),
                'three/tsl$': path.resolve(__dirname, 'node_modules/three/build/three.tsl.js'),
                'troika-worker-utils': path.resolve(__dirname, 'node_modules/troika-worker-utils'),
                'bidi-js': path.resolve(__dirname, 'node_modules/bidi-js'),
                '@dxfom/mtext': path.resolve(__dirname, 'node_modules/@dxfom/mtext')
            },
            fallback: {
                path: false,
                fs: false
            }
        },
        devServer: {
            // static: path.join(__dirname, "test"),
            static: {
                directory: path.join(__dirname, 'public'), // 指定你的静态资源目录，例如 'public' 或 'dist'
                publicPath: '/public/',
                serveIndex: true
            },
            compress: true,
            port: 9002
        },
        stats: {
            errorDetails: true
        },
        module: {
            rules: [
                {
                    test: /\.worker\.ts$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(__dirname, 'src/workers/tsconfig.json'),
                            ...tsLoaderOpts
                        }
                    }
                },
                {
                    test: /\.ts$/,
                    use: {
                        loader: 'ts-loader',
                        options: tsLoaderOpts
                    },
                    exclude: [/node_modules/, /\.worker\.ts$/]
                }
            ]
        },
        plugins: [
            new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
                resource.request = resource.request.replace(/^node:/, '')
            }),
            new webpack.DefinePlugin({
                __SCENE_API_BASE__: JSON.stringify(sceneApiBase)
            }),
            new HtmlWebpackPlugin({
                template: './test/index.html', // 指向你的HTML模板文件
                filename: 'index.html' // 输出的文件名
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'node_modules/draco3dgltf/*.wasm',
                        to: '[name][ext]' // 保持原文件名
                    }
                ]
            })
        ]
    }
}
