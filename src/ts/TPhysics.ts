/**
 * @module
 * @mergeModuleWith <project>
 */

import {
    World,
    Vec3,
    Plane,
    Body,
    Box,
    Material,
    Trimesh,
    Cylinder,
    Sphere,
    Quaternion,
    Ray,
    PointToPointConstraint,
    LockConstraint,
    RaycastResult, ConvexPolyhedron
} from 'cannon-es';
import { Vector3 } from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier';
import { merge } from 'lodash-es';
import { ThingOrigin } from '../ThingOrigin';

/**
 * 物理世界
 */

export class TPhysics {
    private TO: ThingOrigin;
    public world: World;
    shape: Box;

    constructor(TO: ThingOrigin) {
        this.TO = TO;
    }

    /**
     * 初始化物理世界
     * @author MY
     * @since 2024/05/06
     */
    public initWorld(worldInfo?: any): any {
        let defaultParams = {
            allowSleep: false,
            gravity: {
                x: 0,
                y: -9.82,
                z: 0,
            },
        };
        let param = merge(defaultParams, worldInfo);

        this.world = new World({
            gravity: new Vec3(param.gravity.x, param.gravity.y, param.gravity.z),
        });
        return this.world;
    }

    /**
     * 创建Vec3向量
     * @author MY
     * @since 2025/02/18
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {*}  {Vec3}
     */
    public initVec3(x?: number, y?: number, z?: number): Vec3 {
        return new Vec3(x, y, z);
    }

    /**
     * 创建射线
     * @author MY
     * @since 2025/02/18
     * @returns {*}  {Ray}
     */
    public initRay(from: any, to: any): Ray {
        return new Ray(from, to);
    }

    /**
     * 添加物理平面
     * @author MY
     * @since 2024/05/06
     */
    public initPlane(planeInfo: any): Body {
        let defaultParams = {
            mass: 0,
            friction: 0, //摩擦力
            restitution: 0.5, //弹力
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            quaternion: {
                x: -Math.PI / 2,
                y: 0,
                z: 0,
            },
        };
        let param = merge(defaultParams, planeInfo);
        let plane = new Plane();
        const materialCon = new Material('planeMaterial');
        materialCon.friction = param.friction;
        materialCon.restitution = param.restitution; // 设置弹性系数为1
        let planeBody = new Body({
            mass: param.mass,
            shape: plane,
            material: materialCon,
            position: new Vec3(param.position.x, param.position.y, param.position.z),
        });
        planeBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        return planeBody;
    }

    /**
     * 添加物理立方体
     * @author MY
     * @since 2024/05/06
     * @returns {*}  {Box}
     * @param modelInfo
     */
    public initBox(modelInfo: any): Box {
        const defaultParams = {
            x: 1,
            y: 1,
            z: 1,
        };
        let param = Object.assign(defaultParams, modelInfo);
        return new Box(new Vec3(param.x, param.y, param.z));
    }

    /**
     * 添加物理立方体Body
     * @author MY
     * @since 2024/05/06
     * @returns {*}  {Box}
     * @param boxInfo
     */
    public initBoxBody(boxInfo: any): Body {
        let defaultParams = {
            mass: 1,
            friction: 0, //摩擦力
            restitution: 0.5, //弹力
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            quaternion: {
                x: -Math.PI / 2,
                y: 0,
                z: 0,
            },
            base: {
                width: 5,
                height: 5,
                depth: 5,
            },
        };
        let param = merge(defaultParams, boxInfo);

        const halfExtents = new Vec3(
            param.base.width / 2,
            param.base.height / 2,
            param.base.depth / 2
        );
        const boxShape = new Box(halfExtents);
        const materialCon = new Material('boxMaterial');
        materialCon.friction = param.friction;
        materialCon.restitution = param.restitution; // 设置弹性系数为1
        const boxBody: any = new Body({
            mass: param.mass,
            shape: boxShape,
            material: materialCon,
            position: new Vec3(param.position.x, param.position.y, param.position.z),
            allowSleep: true,
        });
        boxBody.name = param.modelName;
        boxBody.userData = param.userData;
        return boxBody;
    }

    /**
     * 添加物理球体
     * @author MY
     * @since 2024/05/06
     * @param sphereInfo 球信息
     */
    public initSphere(sphereInfo: any): Body {
        let defaultParams = {
            mass: 1,
            friction: 0, //摩擦力
            restitution: 0.5, //弹力
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            quaternion: {
                x: -Math.PI / 2,
                y: 0,
                z: 0,
            },
            base: {
                radius: 5,
            },
        };
        let param = merge(defaultParams, sphereInfo);

        const shape = new Sphere(param.base.radius);
        const materialCon = new Material('sphereMaterial');
        materialCon.friction = param.friction;
        materialCon.restitution = param.restitution; // 设置弹性系数为1
        const sphereBody: any = new Body({
            mass: param.mass,
            shape: shape,
            material: materialCon,
            position: new Vec3(param.position.x, param.position.y, param.position.z),
        });
        sphereBody.name = param.modelName;
        return sphereBody;
    }

    /**
     * 添加物理圆柱体
     * @author MY
     * @since 2024/05/06
     * @param {any} modelInfo 圆柱体配置项
     * @returns {*}  {Cylinder}
     */
    public initCylinder(modelInfo: any): Body {
        let defaultParams = {
            mass: 1,
            friction: 0, //摩擦力
            restitution: 0.5, //弹力
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            quaternion: {
                x: -Math.PI / 2,
                y: 0,
                z: 0,
            },
            base: {
                radiusTop: 2,
                radiusBottom: 2,
                height: 2,
                numSegments: 12,
            },
        };
        let param = merge(defaultParams, modelInfo);

        const shape = new Cylinder(
            param.base.radiusTop / 2,
            param.base.radiusBottom / 2,
            param.base.height / 2,
            param.base.numSegments / 2
        );
        const materialCon = new Material('cylinderMaterial');
        materialCon.friction = param.friction;
        materialCon.restitution = param.restitution; // 设置弹性系数为1
        const cylinderBody = new Body({
            mass: 1,
            shape: shape,
            material: materialCon,
            position: new Vec3(param.position.x, param.position.y, param.position.z),
        });
        return cylinderBody;
    }

    public initConvexPolyhedron(model: any, modelInfo: any): Body {
        let defaultParams = {
            mass: 0,
            friction: 0, //摩擦力
            restitution: 0.5, //弹力
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            quaternion: {
                x: 0,
                y: 0,
                z: 0,
            },
        };
        let param = merge(defaultParams, modelInfo);
        // console.log(model)
        const materialCon = new Material('modelMaterial');
        materialCon.friction = param.friction;
        materialCon.restitution = param.restitution; // 设置弹性系数为1
        let body: any = new Body({
            mass: param.mass, // 如果是静态物体，则设为0
            position: new Vec3(model.position.x, model.position.y, model.position.z), // 初始位置
            material: materialCon,
            // ...其他属性...
        });
        body.name = param.modelName;

        model.traverse((child: any) => {
            if (child.isMesh) {
                console.log('child::::::::', child);
                const vertexCount = child.geometry.attributes.position.count

                const indexsCount = child.geometry.index ? child.geometry.index.count : vertexCount
                console.log('indexsCount', indexsCount)

                // 从BufferGeometry 中获取顶点数据
                const positions = child.geometry.getAttribute('position').array;
                // console.log('positions::::::::', positions);
                const vertices = [] as Vec3[];

                // 遍历顶点属性，提取每个顶点的 x、y、z 坐标
                for (let i = 0; i < positions.length; i += 3) {
                    vertices.push(new Vec3(positions[i], positions[i + 1], positions[i + 2]));
                }
                console.log('vertices', vertices)

                const normalsData = child.geometry.getAttribute('normal').array;
                const normals = [] as Vec3[];
                for (let i = 0; i < normalsData.length; i += 3) {
                    normals.push(new Vec3(normalsData[i], normalsData[i + 1], normalsData[i + 2]));
                }

                const indexs = child.geometry.index.array;
                // console.log('6666666666666',indexs)
                const faces = []
                for (let j = 0; j < indexsCount; j += 3) {
                    faces.push([indexs[j], indexs[j + 2], indexs[j + 1]])

                }
                console.log('faces', faces)
                // console.log('vertices', vertices)

                // const vertices = [];
                // // 生成凸包几何体（BufferGeometry 类型）
                // const hullGeometry = new ConvexGeometry(vertices);
                // console.log('hullGeometry', hullGeometry)

                // 1. 提取凸包顶点数据（用于 Cannon）
                // const hullPositions = hullGeometry.attributes.position.array;
                // // const vertices = [];
                // for (let i = 0; i < hullPositions.length; i += 3) {
                //     vertices.push(new Vec3(
                //         hullPositions[i],
                //         hullPositions[i + 1],
                //         hullPositions[i + 2]
                //     ));
                // }

                // // 2. 提取面数据（三角形索引）
                // const positionAttribute = hullGeometry.getAttribute('position');
                // const faceCount = positionAttribute.count / 3; // 每个面3个顶点
                // const faces = [];

                // for (let i = 0; i < faceCount; i++) {
                //     const a = i * 3;       // 第一个顶点索引
                //     const b = i * 3 + 1;   // 第二个顶点索引
                //     const c = i * 3 + 2;   // 第三个顶点索引
                //     faces.push([a, b, c]);
                // }
                // // console.log('三角形面索引：', faces);

                // // 3. 提取法向量数据
                // const normals = [];
                // const normalAttribute = hullGeometry.attributes.normal;
                // for (let i = 0; i < normalAttribute.count; i++) {
                //     normals.push(new Vec3(
                //         normalAttribute.getX(i),
                //         normalAttribute.getY(i),
                //         normalAttribute.getZ(i)
                //     ));
                // }
                const shape: any = new ConvexPolyhedron({ vertices, faces, normals })
                shape.name = child.name
                body.addShape(shape);
            }
        });
        return body;
    }

    /**
     * 添加物理模型(通过包围盒)
     * @author MY
     * @since 2024/05/06
     * @param {any} model 模型配置项
     * @param modelInfo
     * @returns {*}  {Body}
     */
    public initPhyModelByBox(model: any, modelInfo: any): any {
        let defaultParams = {
            mass: 0,
            friction: 0, //摩擦力
            restitution: 0.5, //弹力
            position: {
                x: 0,
                y: 0,
                z: 0,
            },
            quaternion: {
                x: 0,
                y: 0,
                z: 0,
            },
        };
        let param = merge(defaultParams, modelInfo);
        // console.log(model)
        const materialCon = new Material('modelMaterial');
        materialCon.friction = param.friction;
        materialCon.restitution = param.restitution; // 设置弹性系数为1
        let body: any = new Body({
            mass: 0, // 如果是静态物体，则设为0
            position: new Vec3(model.position.x, model.position.y, model.position.z), // 初始位置
            material: materialCon,
            // ...其他属性...
        });
        // let bodyArr = [];
        model.traverse((child: any) => {
            // console.log(child)
            if (child.isMesh) {
                let boundBox = this.TO.tool.getModelBox(child);
                const boundSphere = this.TO.tool.getModelSphere(child);
                const size = boundBox.getSize(new Vector3());
                const center = boundBox.getCenter(new Vector3());
                console.log('boundBox:', boundBox);
                console.log('boundSphere:', boundSphere);
                console.log('size:', size);
                console.log('center:', center);

                const shapeInfo = {
                    x: size.x / 2,
                    y: size.y / 2,
                    z: size.z / 2,
                };
                let shape: any = this.initBox(shapeInfo);
                shape.name = child.name;
                console.log('shape:', shape);
                body.addShape(shape);
                shape.body.position.set(center.x, center.y, center.z);
            }
        });
        body.name = model.name;
        return body;
    }

    /**
     * 添加物理mesh(通过trimesh)
     * @author MY
     * @since 2024/05/06
     * @param {any} model 模型配置项
     * @returns {*}  {Body}
     */
    public initPhyModelByTrimesh(model: any,modelInfo:any): any {
        console.log("initPhyModelByTrimesh",modelInfo);
        let bodyData: any = new Body({
            mass: modelInfo.userData.physics.mass, // 如果是静态物体，则设为0
            position: new Vec3(model.position.x, model.position.y, model.position.z), // 初始位置
            // ...其他属性...
        });
        model.traverse((child: any) => {
            if (child.isMesh) {
                // console.log('child', child);
                const boundSphere = this.TO.tool.getModelSphere(child);
                // console.log('boundSphere', boundSphere);

                let trimesh: any = new Trimesh(
                    child.geometry.attributes.position.array,
                    child.geometry.index?.array
                );
                // 计算Mesh相对于Group中心的变换
                const localPosition = child.localToWorld(this.TO.tool.initVector3());
                const localQuaternion = child.quaternion.clone();

                // 添加形状到Body，并设置位置和旋转
                var shapeOffset = new Vec3(localPosition.x, localPosition.y, localPosition.z);
                console.log('shapeOffset',shapeOffset);
                var shapeQuaternion = new Quaternion(
                    localQuaternion.x,
                    localQuaternion.y,
                    localQuaternion.z,
                    localQuaternion.w
                );

                trimesh.name = child.name;
                bodyData.addShape(trimesh, shapeOffset, shapeQuaternion);
                // trimesh.body.position.copy(shapeOffset);
                // console.log('trimesh.body.position',trimesh.body.position);
                // const vertices = [];//所有三角形顶点位置数据
                // const faces = [];//所有三角形面的索引值
                // const pos = child.geometry.attributes.position;
                // for (let i = 0; i < pos.count; i++) {
                //     const x = pos.getX(i);
                //     const y = pos.getY(i);
                //     const z = pos.getZ(i);
                //     vertices.push(new Vec3(x, y, z));
                // }
                // const index = child.geometry.index.array;
                // for (let i = 0; i < index.length; i += 3) {
                //     const a = index[i];
                //     const b = index[i + 1];
                //     const c = index[i + 2];
                //     faces.push([a, b, c]);
                // }
                // // CannonJS的凸多面体ConvexPolyhedron
                // const shape = new Trimesh( vertices, faces );
                // let body = this.initBody(0, shape, [child.position.x, child.position.y, child.position.z], this.initMaterial({
                //     friction: 0,
                //     restitution: 0
                // }))
                // meshBodyArr.push(body)
            }
        });
        bodyData.name = model.name;
        return bodyData;
        // let indices = []
        // let vertices = []
        // console.log(this.tool.getModelFace(model),this.tool.getModelVertex(model))
        // indices = this.tool.getModelFace(model)
        // vertices = this.tool.getModelVertex(model)
        // const shape = new Trimesh(vertices, indices)
    }

    /**
     * 添加物理body
     * @author MY
     * @since 2024/05/06
     */
    // public initBody(mass: number, shape: any, position: number[], material?: any): any {
    //     return new Body({
    //         mass: mass,
    //         shape: shape,
    //         position: new Vec3(position[0], position[1], position[2]),
    //         material: material,
    //     })
    // }
    public initBody(bodyInfo: any): any {
        return new Body(bodyInfo);
    }

    /**
     * 添加约束--点约束
     * @author MY
     * @since 2025/03/31
     */
    public initPointConstraint(constraintInfo: any): any {
        return new PointToPointConstraint(
            constraintInfo.bodyA,
            new Vec3(constraintInfo.pivotA.x, constraintInfo.pivotA.y, constraintInfo.pivotA.z),
            constraintInfo.bodyB,
            new Vec3(constraintInfo.pivotB.x, constraintInfo.pivotB.y, constraintInfo.pivotB.z)
        );
    }

    /**
     * 添加约束--锁定约束
     * @author MY
     * @since 2025/04/03
     */
    public initLockConstraint(bodyA: any, bodyB: any): any {
        return new LockConstraint(bodyA, bodyB);
    }

    /**
     * 创建射线检测结果
     * @author MY
     * @since 2025/04/03
     */
    public initRaycastResult(): any {
        return new RaycastResult();
    }
}
