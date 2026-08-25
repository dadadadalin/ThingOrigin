/**
 * @module
 * @mergeModuleWith <project>
 */

import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter'
import { TScene } from './TScene'
import { NodeIO } from '@gltf-transform/core'
import {
    ALL_EXTENSIONS,
    KHRDracoMeshCompression,
    KHRMaterialsIOR,
    KHRMaterialsSpecular,
    KHRMaterialsTransmission,
    KHRMaterialsClearcoat,
    KHRMaterialsEmissiveStrength,
    KHRTextureTransform
} from '@gltf-transform/extensions'
import { draco } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { ThingOrigin } from '../ThingOrigin'
/**
 * 导出
 */
export class TExporters {
    private tScene: TScene
    public io: NodeIO
    private TO: ThingOrigin

    constructor(tScene: TScene, TO: ThingOrigin) {
        this.tScene = tScene
        this.io = new NodeIO()
        this.TO = TO
    }

    /**
     * 导出gltf模型文件
     * @author LL
     * @since 2024/07/21
     * @param [fileName="ThingOrigin"]
     */
    public exportGLTF(fileName: string = 'ThingOrigin') {
        var gltfExporter = new GLTFExporter()
        var options = {
            trs: false,
            onlyVisible: true,
            truncateDrawRange: true,
            binary: false,
            forceIndices: false,
            forcePowerOfTwoTextures: false
        }

        gltfExporter.parse(
            this.tScene,
            (result) => {
                if (result instanceof ArrayBuffer) {
                    let blob = this.getBlob(result)
                    this.save(blob, fileName + '.glb')
                } else {
                    var output = JSON.stringify(result, null, 2)
                    this.generateFileName(output, fileName + '.gltf')
                }
            },
            function (error) {
                console.log('An error happened during parsing', error)
            },
            options
        )
    }

    /**
     * 通过Url地址, 轻量化gltf/glb模型文件
     * @author MY
     * @since 2025/07/11
     * @param url 模型地址
     * @param fileName 导出模型名称 默认值 ThingOrigin
     * @remarker 导出文件格式为glb
     */
    public exportLighterByUrl(url: string, fileName: string = 'ThingOrigin') {
        try {
            // 1. 从接口获取模型数据
            var ajax = new XMLHttpRequest()
            let arrayBuffer: unknown
            ajax.open('get', url)
            ajax.send()
            ajax.onreadystatechange = async () => {
                if (ajax.readyState == 4 && ajax.status == 200) {
                    arrayBuffer = ajax.response
                    // 2. 初始化 GLTF 处理工具
                    await this.registerNodeIo()
                    // 3. 读取并处理模型
                    // 处理文本 .gltf 文件
                    const text = String(arrayBuffer)
                    // console.log("text", text);
                    const jsonDoc: any = { json: JSON.parse(text) }
                    // console.log("jsonDoc", jsonDoc);
                    const documentFile = await this.io.readJSON(jsonDoc)
                    // 4. 应用 DRACO 压缩
                    await documentFile.transform(draco({ method: 'edgebreaker' }))
                    // 5. 导出并下载压缩后的模型
                    const glb = await this.io.writeBinary(documentFile)
                    this.generateFileName(glb, fileName + '-lighter.glb')
                }
            }
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * 轻量化gltf/glb模型文件
     * @author MY
     * @since 2025/07/11
     * @param file 模型文件
     * @param fileName 导出模型名称 默认值 ThingOrigin
     * @remarker 导出文件格式为glb
     */
    public async exportLighter(file: File, fileName: string = 'ThingOrigin') {
        let glbBlob = null
        try {
            // 1. 读取文件内容,根据文件类型选择读取方式
            const reader = new FileReader()
            const isBinary = file.name.endsWith('.glb')
            if (isBinary) {
                reader.readAsArrayBuffer(file)
            } else {
                reader.readAsText(file)
            }
            await new Promise((resolve, reject) => {
                reader.onload = async () => {
                    try {
                        // 2. 初始化 GLTF 处理工具
                        await this.registerNodeIo()
                        // 3. 读取并处理模型
                        let documentFile
                        if (isBinary) {
                            // 处理二进制 .glb 文件
                            const arrayBuffer = reader.result as ArrayBuffer
                            const uint8Array = new Uint8Array(arrayBuffer)
                            documentFile = await this.io.readBinary(uint8Array)
                        } else {
                            // 处理文本 .gltf 文件
                            const text = String(reader.result)
                            const jsonDoc: any = { json: JSON.parse(text) }
                            documentFile = await this.io.readJSON(jsonDoc)
                        }
                        // 4. 应用 DRACO 压缩
                        await documentFile.transform(draco({ method: 'edgebreaker' }))
                        // 5. 导出压缩后的模型
                        const glb: any = await this.io.writeBinary(documentFile)
                        glbBlob = new Blob([glb], { type: 'text/plain' })

                        resolve(true)
                    } catch (error) {
                        reject(error)
                    }
                }

                reader.onerror = () => reject(new Error('文件读取失败'))
            })
        } catch (error) {
            console.error(error)
        }
        return glbBlob
    }

    /**
     * 注册nodeio
     * @private
     */
    private async registerNodeIo() {
        this.io
            // .registerExtensions([KHRDracoMeshCompression, KHRMaterialsIOR, KHRMaterialsSpecular, KHRMaterialsTransmission, KHRMaterialsClearcoat, KHRMaterialsEmissiveStrength, KHRTextureTransform])
            .registerExtensions(ALL_EXTENSIONS)
            .registerDependencies({
                'draco3d.decoder': await draco3d.createDecoderModule({
                    // wasmBinaryFile: '/dist/draco_decoder_gltf.wasm',
                    wasmBinaryFile: this.TO.sceneData.params.resource.serverAddress + '/file/loadFile/33'
                }),
                'draco3d.encoder': await draco3d.createEncoderModule({
                    wasmBinaryFile: this.TO.sceneData.params.resource.serverAddress + '/file/loadFile/34'
                })
            })
    }

    /**
     * 生成文件名
     * @private
     * @param blobPart 文件
     * @param filename 文件名称
     */
    private generateFileName(blobPart: ArrayBuffer | ArrayBufferView | Blob | string, filename: string) {
        this.save(new Blob([blobPart], { type: 'text/plain' }), filename)
    }

    /**
     * 获取二进制对象
     * @private
     * @param buffer 二进制数组
     */
    private getBlob(buffer: ArrayBuffer) {
        return new Blob([buffer], { type: 'application/octet-stream' })
    }

    /**
     * 保存文件
     * @private
     * @param blob
     * @param filename
     */
    private save(blob: Blob, filename: string) {
        var link = document.createElement('a')
        link.style.display = 'none'
        document.body.appendChild(link) // Firefox workaround, see #6594

        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()

        // URL.revokeObjectURL( url ); breaks Firefox...
    }
}
