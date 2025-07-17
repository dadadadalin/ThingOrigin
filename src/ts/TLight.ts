import {
    Color,
    DirectionalLight,
    Light,
    AmbientLight,
    PointLight,
    Object3D,
    Vector3,
    HemisphereLight,
    SpotLight,
    Euler,
    RectAreaLight,
    SpotLightHelper,
    DirectionalLightHelper,
    HemisphereLightHelper,
    PointLightHelper,
} from "three"
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper"
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib"
RectAreaLightUniformsLib.init()

import { TScene } from "./TScene"
import {
    AmbientLightOptions,
    DirectionalLightOptions,
    HemisphereLightOptions,
    PointLightOptions,
    RectAreaLightOptions,
    SpotLightOptions,
    PositionType,
    RotationType,
} from "./TLightInterfaces"
import { merge, cloneDeep } from "lodash-es"

/**
 * 光源
 */

export class TLight {
    private tScene: TScene
    private helpers: Map<string, Object3D> = new Map()
    constructor(tScene: TScene) {
        this.tScene = tScene
    }

    /**
     * 添加平行光
     * @author LL gj
     * @since 2023/10/27
     * @param params 灯光参数配置
     */
    public addDirectionalLight(params: DirectionalLightOptions = {}): DirectionalLight {
        const defaultParams: DirectionalLightOptions = {
            color: 0xffffff,
            intensity: 1,
            position: [0, 10, 10],
            target: { x: 0, y: 0, z: 0 },
            castShadow: true,
            shadowNear: 0.5,
            shadowFar: 500,
            shadowMapSize: 1024,
            name: `directionalLight_${Date.now()}`,
            helper: false,
            helperSize: 1,
            helperColor: undefined,
        }

        let options = merge(cloneDeep(defaultParams), params)

        const light = new DirectionalLight(options.color as number, options.intensity)
        this.setPosition(light, options.position as PositionType)
        // 处理投射阴影
        light.castShadow = options.castShadow as boolean
        if (options.castShadow) {
            const shadow = light.shadow
            shadow.camera.near = options.shadowNear as number
            shadow.camera.far = options.shadowFar as number
            shadow.mapSize.width = options.shadowMapSize as number
            shadow.mapSize.height = options.shadowMapSize as number
        }

        light.name = options.name as string
        this.tScene.add(light)

        // 设置目标点
        if (options.target instanceof Object3D) {
            light.target = options.target
            this.tScene.add(options.target)
        } else {
            const targetObj = new Object3D()
            targetObj.position.set(
                (options.target as { x: number; y: number; z: number }).x,
                (options.target as { x: number; y: number; z: number }).y,
                (options.target as { x: number; y: number; z: number }).z
            )
            light.target = targetObj
            this.tScene.add(targetObj)
        }

        // 添加辅助工具
        if (options.helper) {
            this.addDirectionalLightHelper(light, options.helperSize, options.helperColor)
        }

        return light
    }

    /**
     * 添加环境光
     * @author gj
     * @since 2023/10/27
     * @param params 灯光参数配置
     */
    public addAmbientLight(params: AmbientLightOptions = {}): AmbientLight {
        const defaultParams: AmbientLightOptions = {
            color: 0xffffff,
            intensity: 0.5,
            name: `ambientLight_${Date.now()}`,
            helper: false,
        }
        let options = merge(cloneDeep(defaultParams), params)
        const light = new AmbientLight(options.color as number, options.intensity)
        light.name = options.name as string
        this.tScene.add(light)
        // 环境光没有辅助工具
        if (options.helper) {
            console.warn("环境光没有辅助工具")
        }
        return light
    }

    /**
     * 添加点光源
     * @author LL gj
     * @since 2023/10/27
     * @param params 灯光参数配置
     */
    public addPointLight(params: PointLightOptions = {}): PointLight {
        const defaultParams: PointLightOptions = {
            color: 0xffffff,
            intensity: 1,
            distance: 0,
            decay: 1,
            position: [0, 10, 0],
            castShadow: false,
            shadowNear: 0.5,
            shadowFar: 500,
            shadowMapSize: 1024,
            name: `pointLight_${Date.now()}`,
            helper: false,
            helperSize: 1,
            helperColor: undefined,
        }
        let options = merge(cloneDeep(defaultParams), params)

        const light = new PointLight(options.color as number, options.intensity, options.distance, options.decay)

        this.setPosition(light, options.position as PositionType)
        //处理投射阴影
        light.castShadow = options.castShadow as boolean
        if (options.castShadow) {
            const shadow = light.shadow
            shadow.camera.near = options.shadowNear as number
            shadow.camera.far = options.shadowFar as number
            shadow.mapSize.width = options.shadowMapSize as number
            shadow.mapSize.height = options.shadowMapSize as number
        }

        light.name = options.name as string
        this.tScene.add(light)
        // 添加辅助工具
        if (options.helper) {
            this.addPointLightHelper(light, options.helperSize, options.helperColor)
        }
        return light
    }
    /**
     * 添加半球光
     * @author gj
     * @since 2025/07/11
     * @param params 灯光参数配置
     */
    public addHemisphereLight(params: HemisphereLightOptions = {}): HemisphereLight {
        const defaultParams: HemisphereLightOptions = {
            skyColor: 0xffffff,
            groundColor: 0x000000,
            intensity: 1,
            position: [0, 10, 0],
            name: `hemisphereLight_${Date.now()}`,
            helper: false,
            helperSize: 1,
            helperColor: undefined,
        }

        let options = merge(cloneDeep(defaultParams), params)

        const light = new HemisphereLight(options.skyColor as number, options.groundColor as number, options.intensity)

        this.setPosition(light, options.position as PositionType)

        light.name = options.name as string
        this.tScene.add(light)
        // 添加辅助工具
        if (options.helper) {
            this.addHemisphereLightHelper(light, options.helperSize, options.helperColor)
        }
        return light
    }
    /**
     * 添加平面光光源
     * @author gj
     * @since 2025/07/11
     * @param params 灯光参数配置
     */
    public addRectAreaLight(params: RectAreaLightOptions = {}): RectAreaLight {
        const defaultParams: RectAreaLightOptions = {
            color: 0xffffff,
            intensity: 5,
            width: 10,
            height: 10,
            position: [0, 10, 0],
            rotation: [0, 0, 0],
            name: `rectAreaLight_${Date.now()}`,
            helper: false,
            helperSize: 1,
            helperColor: undefined,
        }

        let options = merge(cloneDeep(defaultParams), params)

        // 注意事项:
        // 不支持阴影。
        // 只支持 MeshStandardMaterial 和 MeshPhysicalMaterial 两种材质。
        // 必须在场景中加入 RectAreaLightUniformsLib，并调用 init()。

        // 需要引入 RectAreaLightHelper 和 RectAreaLightUniformsLib
        // import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';
        // RectAreaLightUniformsLib.init();

        const light = new RectAreaLight(options.color as number, options.intensity, options.width, options.height)

        this.setPosition(light, options.position as PositionType)
        if (options.rotation) {
            this.setRotation(light, options.rotation)
        }

        light.name = options.name as string

        this.tScene.add(light)

        // 添加辅助工具
        if (options.helper) {
            this.addRectAreaLightHelper(light, options.helperSize, options.helperColor)
        }
        return light
    }

    /**
     * 添加聚光灯
     * @author gj
     * @since 2025/07/11
     * @param params 灯光参数配置
     */
    public addSpotLight(params: SpotLightOptions = {}): SpotLight {
        const defaultParams: SpotLightOptions = {
            color: 0xffffff,
            intensity: 1,
            distance: 0,
            angle: Math.PI / 3,
            penumbra: 0,
            decay: 1,
            position: [0, 10, 0],
            target: { x: 0, y: 0, z: 0 },
            castShadow: false,
            shadowNear: 0.5,
            shadowFar: 500,
            shadowMapSize: 1024,
            name: `spotLight_${Date.now()}`,
            helper: false,
            helperSize: 1,
            helperColor: undefined,
        }

        let options = merge(cloneDeep(defaultParams), params)

        const light = new SpotLight(options.color as number, options.intensity, options.distance, options.angle, options.penumbra, options.decay)

        this.setPosition(light, options.position as PositionType)

        //处理投射阴影
        light.castShadow = options.castShadow as boolean

        if (options.castShadow) {
            const shadow = light.shadow
            shadow.camera.near = options.shadowNear as number
            shadow.camera.far = options.shadowFar as number
            shadow.mapSize.width = options.shadowMapSize as number
            shadow.mapSize.height = options.shadowMapSize as number
        }

        light.name = options.name as string
        this.tScene.add(light)

        // 设置目标点
        if (options.target instanceof Object3D) {
            light.target = options.target
            this.tScene.add(options.target)
        } else {
            const targetObj = new Object3D()
            targetObj.position.set(
                (options.target as { x: number; y: number; z: number }).x,
                (options.target as { x: number; y: number; z: number }).y,
                (options.target as { x: number; y: number; z: number }).z
            )
            light.target = targetObj
            this.tScene.add(targetObj)
        }

        // 添加辅助工具
        if (options.helper) {
            this.addSpotLightHelper(light, options.helperSize, options.helperColor)
        }

        return light
    }

    /**
     * 添加平行光辅助工具
     * @author gj
     * @since 2025/07/11
     * @param light 平行光
     * @param size 辅助工具大小
     * @param color 辅助工具颜色
     */
    public addDirectionalLightHelper(light: DirectionalLight, size: number = 1, color?: number): DirectionalLightHelper {
        this.ensureLightInScene(light)
        const helper = new DirectionalLightHelper(light, size, color)
        helper.name = `${light.name}_helper`
        this.tScene.add(helper)
        this.helpers.set(light.name, helper)
        return helper
    }

    /**
     * 添加半球光辅助工具
     * @author gj
     * @since 2025/07/11
     * @param light 半球光光源
     * @param size 辅助工具大小
     * @param color 辅助工具颜色
     */
    public addHemisphereLightHelper(light: HemisphereLight, size: number = 1, color?: number): HemisphereLightHelper {
        this.ensureLightInScene(light)
        const helper = new HemisphereLightHelper(light, size, color)
        helper.name = `${light.name}_helper`
        this.tScene.add(helper)
        this.helpers.set(light.name, helper)
        return helper
    }

    /**
     * 添加点光源辅助工具
     * @author gj
     * @since 2025/07/11
     * @param light 点光源
     * @param size 辅助工具大小
     * @param color 辅助工具颜色
     */
    public addPointLightHelper(light: PointLight, size: number = 1, color?: number): PointLightHelper {
        this.ensureLightInScene(light)
        const helper = new PointLightHelper(light, size, color)
        helper.name = `${light.name}_helper`
        this.tScene.add(helper)
        this.helpers.set(light.name, helper)
        return helper
    }

    /**
     * 添加平面光辅助工具
     * @author gj
     * @since 2025/07/11
     * @param light 平面光
     * @param size 辅助工具大小
     * @param color 辅助工具颜色
     */
    public addRectAreaLightHelper(light: RectAreaLight, size: number = 1, color?: number): any {
        this.ensureLightInScene(light)
        // @ts-ignore
        const helper = new RectAreaLightHelper(light, size, color)
        helper.name = `${light.name}_helper`
        this.tScene.add(helper)
        this.helpers.set(light.name, helper)
        return helper
    }

    /**
     * 添加聚光灯辅助工具
     * @author gj
     * @since 2025/07/11
     * @param light 聚光灯
     * @param size 辅助工具大小
     * @param color 辅助工具颜色
     */
    public addSpotLightHelper(light: SpotLight, size: number = 1, color?: number): SpotLightHelper {
        this.ensureLightInScene(light)
        const helper = new SpotLightHelper(light, color)
        helper.name = `${light.name}_helper`
        this.tScene.add(helper)
        this.helpers.set(light.name, helper)
        return helper
    }

    /**
     * 删除光源（根据name删除）
     * @author LL gj
     * @since 2025/07/11
     * @param name 光源名称
     */
    public removeLight(name: string): boolean {
        const light = this.getLight(name)
        if (light) {
            // 如果有辅助工具，先删除辅助工具
            this.removeLightHelper(name)

            // 如果是聚光灯或平行光，需要同时移除target对象
            if (light instanceof SpotLight || light instanceof DirectionalLight) {
                if (light.target && light.target.parent === this.tScene) {
                    this.tScene.remove(light.target)
                }
            }

            this.tScene.remove(light)
            return true
        }
        return false
    }
    /**
     * 删除光源辅助工具（根据name删除）
     * @author gj
     * @since 2025/07/11
     * @param lightName 光源名称
     */
    public removeLightHelper(lightName: string): boolean {
        const helper = this.helpers.get(lightName)
        if (helper) {
            this.tScene.remove(helper)
            this.helpers.delete(lightName)
            return true
        }
        return false
    }

    /**
     * 获取光源（根据name获取）
     * @author gj
     * @since 2025/07/11
     * @param name 光源名称
     */
    public getLight(name: string): Light | undefined {
        return this.tScene.getObjectByName(name) as Light | undefined
    }
    /**
     * 获取光源辅助工具（根据name获取）
     * @author gj
     * @since 2025/07/11
     * @param lightName 光源名称
     */
    public getLightHelper(lightName: string): Object3D | undefined {
        return this.helpers.get(lightName)
    }

    /**
     * 确保光源已添加到场景
     * @author gj
     */
    private ensureLightInScene(light: Light): void {
        if (!light.parent) {
            this.tScene.add(light)
        }
    }

    /**
     * 设置位置（支持多种格式）
     * @author gj
     */
    private setPosition(object: Object3D, position: PositionType) {
        if (position instanceof Vector3) {
            object.position.copy(position)
        } else if (Array.isArray(position)) {
            object.position.set(position[0], position[1], position[2])
        } else {
            object.position.set(position.x, position.y, position.z)
        }
    }
    /**
     * 设置旋转（支持多种格式）
     * @author gj
     */
    private setRotation(object: Object3D, rotation: RotationType) {
        if (rotation instanceof Euler) {
            object.rotation.copy(rotation)
        } else if (Array.isArray(rotation)) {
            object.rotation.set(rotation[0], rotation[1], rotation[2])
        } else {
            object.rotation.set(rotation.x, rotation.y, rotation.z)
        }
    }
}
