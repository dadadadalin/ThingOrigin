/**
 * @module
 * @mergeModuleWith <project>
 */

import { Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { LoftGeometry } from 'three/examples/jsm/geometries/LoftGeometry.js'
import { CityGenerator } from 'three/examples/jsm/generators/CityGenerator.js'
import { SkyscraperGenerator } from 'three/examples/jsm/generators/city/SkyscraperGenerator.js'
import { ThingOrigin } from '../ThingOrigin'
import { setModelConfig } from '../private/privateTool'

/**
 * @group Interfaces
 */
export interface LoftOptions {
    modelName?: string
    sections: Vector3[][]
    capStart?: boolean
    capEnd?: boolean
    color?: string
    position?: { x: number; y: number; z: number }
}

/**
 * @group Interfaces
 */
export interface CityOptions {
    seed?: number
    blocksX?: number
    blocksZ?: number
}

/**
 * @group Interfaces
 */
export interface BuildingOptions {
    seed?: number
    width?: number
    depth?: number
    height?: number
}

/**
 * r185 程序化生成：城市 / 建筑 / Loft 放样
 */
export class TGenerator {
    private TO: ThingOrigin

    public cityGroup: Group | null = null
    public buildingGroup: Group | null = null

    constructor(TO: ThingOrigin) {
        this.TO = TO
    }

    /** 程序化城市 */
    public createCity(options: CityOptions = {}): Group {
        this.removeCity()
        const city = new CityGenerator({
            seed: options.seed ?? 1,
            blocksX: options.blocksX ?? 3,
            blocksZ: options.blocksZ ?? 3,
        })
        const group = city.build()
        group.name = 'TO_procedural_city'
        this.TO.scene.add(group)
        this.cityGroup = group
        return group
    }

    public removeCity(): void {
        if (this.cityGroup) {
            this.TO.scene.remove(this.cityGroup)
            this.cityGroup = null
        }
    }

    /** 单栋程序化建筑 */
    public createBuilding(options: BuildingOptions = {}): Group {
        this.removeBuilding()
        const gen = new SkyscraperGenerator({
            seed: options.seed ?? Date.now(),
            totalHeight: options.height ?? 40,
            footprint: {
                width: options.width ?? 12,
                depth: options.depth ?? 12,
            },
        })
        const mesh = gen.build()
        const group = new Group()
        group.name = 'TO_procedural_building'
        group.add(mesh)
        this.TO.scene.add(group)
        this.buildingGroup = group
        return group
    }

    public removeBuilding(): void {
        if (this.buildingGroup) {
            this.TO.scene.remove(this.buildingGroup)
            this.buildingGroup = null
        }
    }

    /** Loft 放样几何 */
    public createLoft(options: LoftOptions): Object3D {
        const geometry = new LoftGeometry(options.sections, {
            capStart: options.capStart ?? true,
            capEnd: options.capEnd ?? true,
        })
        const material = new MeshStandardMaterial({
            color: options.color ?? '#6c9bcf',
            metalness: 0.2,
            roughness: 0.6,
        })
        const mesh = new Mesh(geometry, material)
        const param = {
            modelName: options.modelName ?? `loft-${Date.now()}`,
            modelType: 'loft',
            position: options.position ?? { x: 0, y: 5, z: 0 },
        }
        return setModelConfig(mesh, param, this.TO)
    }

    public dispose(): void {
        this.removeCity()
        this.removeBuilding()
    }
}
