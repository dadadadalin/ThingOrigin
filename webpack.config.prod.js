const path = require('path')
// const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')

/** 将 zip Worker chunk 内联进主包，部署时只需 ThingOrigin2.0.js */
class InlineUnzipWorkerPlugin {
    constructor(opts = {}) {
        this.mainFile = opts.mainFile || 'ThingOrigin2.0.js'
    }

    apply(compiler) {
        const { webpack } = compiler
        compiler.hooks.thisCompilation.tap('InlineUnzipWorkerPlugin', (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: 'InlineUnzipWorkerPlugin',
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
                },
                (assets) => {
                    if (!assets[this.mainFile]) return

                    let workerFile = null
                    for (const chunk of compilation.chunks) {
                        if (chunk.canBeInitial()) continue
                        for (const file of chunk.files) {
                            if (file.endsWith('.js') && file !== this.mainFile) workerFile = file
                        }
                    }
                    if (!workerFile || !assets[workerFile]) return

                    const workerSrc = assets[workerFile].source()
                    const mainSrc = assets[this.mainFile].source()
                    const inject = `globalThis.__TO_UNZIP_WORKER__=${JSON.stringify(workerSrc)};`

                    compilation.updateAsset(this.mainFile, new webpack.sources.RawSource(inject + mainSrc))
                    compilation.deleteAsset(workerFile)
                }
            )
        })
    }
}

const tsLoaderOpts = { transpileOnly: true }

/** npm run build:https → https:8443，否则 npm run build → http:8082 */
function sceneApiBaseFromEnv(env) {
    const isHttps = env && env.variant === 'https'
    return isHttps ? 'https://124.70.30.193:8444' : 'http://124.70.30.193:8082'
}

module.exports = (env = {}) => {
    const sceneApiBase = sceneApiBaseFromEnv(env)

    return {
        mode: 'production',
        entry: './src/ThingOrigin.ts',
        performance: {
            hints: false
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'ThingOrigin2.0.js',
            // 非入口 chunk（Web Worker 等）单独命名，避免与主包 ThingOrigin2.0.js 混淆
            chunkFilename: '[name].js'
            // library: 'ThingOrigin',
            // libraryTarget: 'umd',
            // globalObject: 'this'
        },
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
        optimization: {
            minimize: true,
            splitChunks: false, // 禁用代码分割
            runtimeChunk: false, // 禁用 runtime chunk
            minimizer: [
                new TerserPlugin({
                    extractComments: false, // 禁用提取注释到单独文件
                    terserOptions: {
                        format: {
                            comments: /中国科学院沈阳自动化研究所/ // 保留特定注释
                        }
                    }
                })
            ]
        },
        plugins: [
            new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
                resource.request = resource.request.replace(/^node:/, '')
            }),
            new webpack.DefinePlugin({
                __SCENE_API_BASE__: JSON.stringify(sceneApiBase)
            }),
            new webpack.BannerPlugin({
                banner: `/*! 中国科学院沈阳自动化研究所-3D引擎 by 李林\n@license MIT ${new Date().toLocaleString()} */`,
                raw: true, // 如果你的banner是原始字符串，而不是需要被eval的JavaScript，设置为true
                entryOnly: false // 默认为false，表示在所有输出的chunk中插入banner，如果设为true，则只在入口c
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'node_modules/draco3dgltf/*.wasm',
                        to: '[name][ext]' // 保持原文件名
                    }
                ]
            }),
            // 合并动态 import() 异步 chunk；zip Worker 由 InlineUnzipWorkerPlugin 内联进主包
            new webpack.optimize.LimitChunkCountPlugin({
                maxChunks: 1
            }),
            new InlineUnzipWorkerPlugin()
            // new UglifyJsPlugin(),
        ]
    }
}
