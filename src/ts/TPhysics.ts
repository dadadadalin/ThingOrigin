import { World, NaiveBroadphase, Plane, Body, Vec3, Box } from "cannon";

export class TPhysics {
  public world: World;
  public shape: Box;
  public body: Body;
  public mass: number = 1;

  public initPhysics() {
    this.world = new World();
    this.world.gravity.set(0, -10, 0);
    this.world.broadphase = new NaiveBroadphase();
    this.world.solver.iterations = 10; //迭代次数

    // world.defaultContactMaterial.contactEquationStiffness = 1e7;
    // world.defaultContactMaterial.contactEquationRelaxation = 4;

    // Create a plane
    var groundShape = new Plane();
    var groundBody = new Body({ mass: 0 });
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
}
