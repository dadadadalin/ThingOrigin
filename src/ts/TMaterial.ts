import { BackSide, DoubleSide, FrontSide, LinearFilter,
     Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial,
     MeshDepthMaterial,MeshMatcapMaterial,MeshNormalMaterial,MeshLambertMaterial,MeshPhongMaterial,MeshToonMaterial,
     LineBasicMaterial, LineDashedMaterial, MeshDistanceMaterial, PointsMaterial, ShadowMaterial,
      RGBFormat, SpriteMaterial, TextureLoader, CubeTextureLoader, VideoTexture 
    } from "three";
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
     * @description 切换模型材质贴图
     * @author gj
     * @date 2023/11/3
     * @param {string} sceneName 场景名称
     * @param {string} uuid 模型uuid
     * @param {textureParams} options 材质贴图参数集合
     */
    public changeTextureMap(sceneName: string, uuid: string, options: textureParams): void {
        let obj = ThingOrigin.getScene(sceneName).getObjectByProperty("uuid", uuid);
        if (!obj) {
            console.warn("切换材质贴图失败，物体不存在");
            return;
        }

        //金属材质，漫反射，金属漆，涂料，塑料，绒布，发光，半透明，玻璃，电介质，通用，基础PBR
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

                let materialObj = {};
                for(let key in options){
                    if(options.hasOwnProperty(key)){
                        if(!['img', 'materialType','side'].includes(key)){
                            materialObj[key] = options[key];
                        }
                        if('side' === key){
                            switch(options[key]){
                                case 'FrontSide': materialObj[key] =  FrontSide; break;
                                case 'BackSide': materialObj[key] =  BackSide; break;
                                case 'DoubleSide': materialObj[key] =  DoubleSide; break;
                            }
                        }
                        if(['map','normalMap','roughnessMap','metalnessMap','lightMap','aoMap'].includes(key)){
                            materialObj[key] = new TextureLoader().load(options[key])
                        }
                        if('envMap' === key){
                            materialObj[key] =  new CubeTextureLoader().load(options[key]);
                        }
                    }
                }

                let keyName = options.materialType;
                const modeMap = {
                    LineBasicMaterial: () => new LineBasicMaterial({ ...materialObj }), //基础线条材质
                    LineDashedMaterial: () => new LineDashedMaterial({ ...materialObj }), //虚线材质
                    MeshBasicMaterial: () => new MeshBasicMaterial({ ...materialObj }), //基础网格材质
                    MeshDepthMaterial: () => new MeshDepthMaterial({ ...materialObj }), // 深度网格材质
                    MeshDistanceMaterial:() => new MeshDistanceMaterial({ ...materialObj }), //距离材质
                    MeshLambertMaterial: () => new MeshLambertMaterial({ ...materialObj }), // (Lambert网格)兰伯特材质
                    MeshMatcapMaterial: () => new MeshMatcapMaterial({ ...materialObj }), //捕捉材质
                    MeshNormalMaterial: () => new MeshNormalMaterial({ ...materialObj }), //法线网格材质
                    MeshPhongMaterial: () => new MeshPhongMaterial({ ...materialObj }), //Phong网格材质
                    MeshPhysicalMaterial: () => new MeshPhysicalMaterial({ ...materialObj }), //物理网格材质
                    MeshStandardMaterial: () => new MeshStandardMaterial({ ...materialObj }), //标准网格材质
                    MeshToonMaterial: () => new MeshToonMaterial({ ...materialObj }), //卡通着色材质
                    PointsMaterial: () => new PointsMaterial({ ...materialObj }), //点材质
                    ShadowMaterial: () => new ShadowMaterial({ ...materialObj }) //阴影材质
                }
                
                child.material = modeMap[keyName] ? modeMap[keyName]() : {};
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
