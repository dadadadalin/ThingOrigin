import { BackSide, DoubleSide, FrontSide, LinearFilter, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, RGBFormat, SpriteMaterial, TextureLoader, VideoTexture } from "three";
import { ThingOrigin } from "./../ThingOrigin";

export class TMaterial {
    /**
     * @description 创建精灵材质
     * @author LL
     * @param {string} url
     * @param {string} color
     * @param {boolean} fog
     * @return {*}  {SpriteMaterial}
     */
    public initSpriteMaterial(url: string, color: string, fog: boolean): SpriteMaterial {
        var textureLoader = new TextureLoader();

        var mapB = textureLoader.load(url);
        var materialB = new SpriteMaterial({ map: mapB, color: color, fog: fog });

        return materialB;
    }

    /**
     * @description 切换几何体纹理贴图
     * @author gj
     * @param {string} sceneName
     * @param {string} uuid
     * @param {textureParams} options
     */
    public changeGeometryTexture(sceneName: string, uuid: string, options: textureParams): void {
        let obj = ThingOrigin.getScene(sceneName).getObjectByProperty("uuid", uuid);
        if (!obj) {
            console.warn("切换贴图失败，物体不存在");
            return;
        }

        obj.traverse((child) => {
            if (child instanceof Mesh) {
                if (child.material) {
                    if (child.material instanceof Array) {
                        for (let i = 0; i < child.material.length; i++) {
                            child.material[i].dispose();
                        }
                    } else {
                        child.material.dispose();
                    }
                }
                // switch(materialType){
                // case 'physical':
                child.material = new MeshPhysicalMaterial({
                    color: options.color, //三维里的颜色
                    emissive: options.emissive, //自发光
                    wireframe: options.wireframe, //网格
                    roughness: options.roughness, //粗糙度
                    metalness: options.metalness, //金属度
                    transparent: options.transparent, //是否透明
                    opacity: options.opacity, //透明度
                    side: options.side == "FrontSide" ? FrontSide : options.side == "BackSide" ? BackSide : DoubleSide, //side
                    map: options.map == "" ? null : new TextureLoader().load(options.map), //贴图
                    normalMap: options.normalMap == "" ? null : new TextureLoader().load(options.normalMap), //法线贴图
                    roughnessMap: options.roughnessMap == "" ? null : new TextureLoader().load(options.roughnessMap), //粗糙贴图
                    metalnessMap: options.metalnessMap == "" ? null : new TextureLoader().load(options.metalnessMap), //金属贴图
                    envMap: options.envMap == "" ? null : new TextureLoader().load(options.envMap), //环境贴图
                    lightMap: options.lightMap == "" ? null : new TextureLoader().load(options.lightMap), //光照贴图
                    aoMap: options.aoMap == "" ? null : new TextureLoader().load(options.aoMap), //AO贴图
                });
                // break;
                // }
            }
        });
    }

    /**
     * @description 生成视频材质
     * @author LL
     * @date 2021/09/02
     * @param {HTMLVideoElement} videoDom
     */
    public initVideoMaterial(videoDom: HTMLVideoElement): VideoTexture {
        var texture = new VideoTexture(videoDom);
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.format = RGBFormat;

        return texture;
    }

    public initPicMaterial(url: string): MeshBasicMaterial {
        const texture = new TextureLoader().load(url);
        let material = new MeshBasicMaterial();
        material.map = texture;
        return material;
    }
}
