/**
 * @module
 * @mergeModuleWith <project>
 */

//@ts-ignore
import { Viewer } from "../../dependencies/three-dxf"
import DxfParser from "dxf-parser"

/**
 * 用于绘制dxf图纸
 */
export class TCAD {
    // 保存当前Viewer实例，用于清除操作
    private viewer: Viewer | null = null
    constructor() {}

    /**
     * 解析dxf文件
     * @author LL
     * @since 2025/05/27
     * @param {string} url
     */
    public async getDXF(url: string) {
        const response = await fetch(url)
        const fileText = await response.text()

        let blobContent = new Blob([fileText], { type: "text/plain" })

        return blobContent
    }

    /**
     * 绘制dxf文件
     * @author LL
     * @since 2025/05/27
     * @param {string} url
     * @param {string} domId
     */
    public async drawDXF(url: string, domId?: string): Promise<void> {
        // 如果已有渲染实例，先清除
        if (domId) {
            this.clear(domId)
        }

        return new Promise((resolve, reject) => {
            this.getDXF(url)
                .then((text) => {
                    const reader = new FileReader()
                    //@ts-ignore
                    reader.readAsText(text as Blob)

                    reader.onloadend = (e) => {
                        try {
                            const contents = e.target.result

                            const parser = new DxfParser()
                            //@ts-ignore
                            const dxf = parser.parseSync(contents)

                            let pic = document.getElementById(domId)

                            if (!pic) {
                                const errorMsg = `找不到渲染容器，domId: ${domId}`
                                console.log(errorMsg)
                                reject(new Error(errorMsg))
                                return
                            }

                            // 清空容器之前的内容
                            pic.innerHTML = ""

                            // 不传递字体参数，让troika-three-text使用默认字体
                            //@ts-ignore
                            this.viewer = new Viewer(dxf, pic, pic?.clientWidth, pic?.clientHeight, null)

                            // 渲染完成，解析Promise
                            resolve()
                        } catch (error) {
                            // 处理错误，拒绝Promise
                            reject(error)
                        }
                    }

                    reader.onerror = (error) => {
                        reject(error)
                    }
                })
                .catch((error) => {
                    reject(error)
                })
        })
    }

    /**
     * 清除指定容器中的CAD图纸
     * @author gj
     * @since 2025/10/13
     * @param {string} domId - 渲染容器的DOM ID
     */
    public clear(domId: string): void {
        const container = document.getElementById(domId)

        if (!container) {
            console.log("找不到要清除的容器，domId:", domId)
            return
        }

        // 清空容器内容
        container.innerHTML = ""

        // 销毁Viewer实例以释放资源
        if (this.viewer) {
            // 检查Viewer是否有destroy方法，有则调用
            if (typeof this.viewer.destroy === "function") {
                this.viewer.destroy()
            }
            this.viewer = null
        }
    }
}
