import {World, NaiveBroadphase, Plane, Body, Vec3, Box, Material, Trimesh} from "cannon-es";

export class TPhysics {
    public world: World;
    public shape: Box;
    public body: Body;
    public mass: number = 1;

    public initPhysics() {
        this.world = new World();
        this.world.gravity.set(0, -10, 0);
        this.world.broadphase = new NaiveBroadphase();
        // this.world.solver.iterations = 10; //迭代次数

        // world.defaultContactMaterial.contactEquationStiffness = 1e7;
        // world.defaultContactMaterial.contactEquationRelaxation = 4;

        // Create a plane
        var groundShape = new Plane();
        var groundBody = new Body({mass: 0});
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);

        this.shape = new Box(new Vec3(11, 4, 6));
        this.body = new Body({
            mass: 1,
        });
        this.body.addShape(this.shape);
        this.body.position.set(0, 30, 0);
        this.body.angularVelocity.set(1, 10, 1); //角速度
        this.body.angularDamping = 0.01; //角度阻尼
        this.world.addBody(this.body);
    }

    /**
     * @description 初始化物理世界
     * @author MY
     * @date 2024/05/06
     * @returns {*}  {World}
     */
    public initWorld():World {
        return new World({
            gravity: new Vec3(0,-10,0)
        })
        // this.world = new World();
        // this.world.gravity.set(0, -10, 0)
    }

    /**
     * @description 添加物理平面
     * @author MY
     * @date 2024/05/06
     * @returns {*}  {Plane}
     */
    public initPlane(): Plane {
        return new Plane()
    }

    /**
     * @description 添加物理几何体
     * @author MY
     * @date 2024/05/06
     * @returns {*}  {Box}
     */
    public initBox(modelInfo: any): Box {
        const {width, height, depth} = modelInfo.base;
        const x = Number((width / 2).toFixed(0))
        const y = Number((height / 2).toFixed(0))
        const z = Number((depth / 2).toFixed(0))
        return new Box(new Vec3(x, y, z))
    }

    /**
     * @description 添加材质
     * @author MY
     * @date 2024/05/06
     * @returns {*}  {Material}
     */
    public initMaterial(physicsInfo: any): Material {
        const {friction, restitution} = physicsInfo
        return new Material(
            {
                friction: friction,
                restitution: restitution
            },
        )
    }

    /**
     * @description 添加物理模型
     * @author MY
     * @date 2024/05/06
     * @returns {*}  {Trimesh}
     */
    public initPhyModel(model: any): Trimesh {
        const positionArr = model.children[0].geometry.attributes.position.array
        const indexArr = model.children[0].geometry.index.array
        return new Trimesh(positionArr, indexArr)
    }

    /**
     * @description 添加物理body
     * @author MY
     * @date 2024/05/06
     * @returns {*}  {Body}
     */
    public initBody(mass:number,shape:any,position:number[],material?: any): Body {
        return new Body({
            mass: mass,
            shape: shape,
            position: new Vec3(position[0],position[1],position[2]),
            material: material,
        })
    }
}
