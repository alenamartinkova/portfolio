import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3, Quaternion, Matrix } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import "@babylonjs/core/Meshes/instancedMesh";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { enablePhysics, rigid } from "./physics";
import { buildAircraftColliders, STAIR_STEPS } from "./equipment";
import {
  renderScale,
  renderAntialiasing,
} from "../../../shared/render-budget.js";
import {
  constructScene,
  prepareSceneMaterials,
} from "../../../shared/scene-construction.js";
import { staticDecorationSteps } from "../../../shared/static-batches.js";
import { recordRenderedFrame } from "../../../shared/fps-meter.js";
import { RampVehicle } from "./vehicles";
import {
  VEHICLES,
  dockQuality,
  done,
  penalize,
  type FlightState,
  type Pose,
  type Task,
  type VehicleId,
} from "./core/operations";

const colors = {
  ground: "#36454b",
  asphalt: "#27343a",
  line: "#e3bc62",
  violet: "#9364d7",
  white: "#e7e8e0",
  dark: "#233442",
  glass: "#75a5ad",
  green: "#9adcaf",
  orange: "#ecaa66",
};
export class AirportWorld {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: FreeCamera;
  readonly plane: TransformNode;
  readonly vehicles = {} as Record<VehicleId, RampVehicle>;
  readonly poses = {} as Record<VehicleId, Pose>;
  private materials = new Map<string, StandardMaterial>();
  private decals: DynamicTexture[] = [];
  private colliders: Mesh[] = [];
  private airplaneBodies = new Set<PhysicsBody>();
  private props: TransformNode[] = [];
  private fleet: RampVehicle[] = [];
  private settledFor = 0;
  physicsActive = true;
  private passengers!: Mesh;
  private bags!: Mesh;
  private marker!: Mesh;
  private markerMaterial!: StandardMaterial;
  private markerArrow!: Mesh;
  private markerColors = {
    perfect: Color3.FromHexString("#a7efc0"),
    close: Color3.FromHexString("#ffd287"),
    far: Color3.FromHexString("#c7a5ff"),
  };
  private dent!: Mesh;
  private gpu!: Mesh;
  private chocks!: Mesh;
  private target = Vector3.Zero();
  private cameraTarget = Vector3.Zero();
  private matrix = Matrix.Identity();
  private rotation = Quaternion.Identity();
  private scale = new Vector3(1, 1, 1);
  private point = Vector3.Zero();
  private observer: ResizeObserver;
  private disposed = false;
  private previousPhase = "";
  private aspect = 1;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  onInvalidate = () => {};
  private constructor(
    readonly canvas: HTMLCanvasElement,
    readonly state: FlightState,
  ) {
    this.engine = new Engine(
      canvas,
      false,
      {
        powerPreference: "low-power",
        preserveDrawingBuffer: false,
        stencil: true,
      },
      false,
    );
    this.scene = new Scene(this.engine);
    this.scene.physicsEnabled = false;
    this.scene.clearColor = Color4.FromHexString("#9cbbbfff");
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = state.flight === 2 ? 0.001 : 0.00045;
    this.scene.fogColor = Color3.FromHexString("#9cbbbf");
    this.camera = new FreeCamera(
      "ramp camera",
      new Vector3(50, 58, 68),
      this.scene,
    );
    this.camera.minZ = 0.2;
    this.camera.maxZ = 4500;
    this.camera.setTarget(Vector3.Zero());
    this.plane = new TransformNode("aircraft", this.scene);
    this.plane.metadata = { dynamic: true };
    const hemi = new HemisphericLight("sky", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.9;
    hemi.groundColor = Color3.FromHexString("#63797f");
    const sun = new DirectionalLight(
      "late afternoon",
      new Vector3(-0.5, -1, 0.4),
      this.scene,
    );
    sun.intensity = state.flight === 2 ? 0.65 : 1.05;
    sun.diffuse = Color3.FromHexString("#ffe0b5");
    const aa = renderAntialiasing(this.engine.getCaps().maxMSAASamples);
    const pipeline = new DefaultRenderingPipeline(
      "antialiasing",
      false,
      this.scene,
      [this.camera],
    );
    pipeline.samples = aa.samples;
    pipeline.fxaaEnabled = aa.fxaa;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }
  static async create(
    canvas: HTMLCanvasElement,
    state: FlightState,
    signal: AbortSignal,
  ) {
    const world = new AirportWorld(canvas, state);
    const abort = () => world.dispose();
    signal.addEventListener("abort", abort, { once: true });
    try {
      const plugin = await enablePhysics(world.scene);
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const previous = world.scene.blockMaterialDirtyMechanism;
      world.scene.blockMaterialDirtyMechanism = true;
      try {
        await constructScene(world.build(), {
          isCancelled: () => signal.aborted || world.disposed,
        });
      } finally {
        if (!world.scene.isDisposed)
          world.scene.blockMaterialDirtyMechanism = previous;
      }
      plugin.onCollisionObservable.add((e) => {
        if (
          state.phase !== "service" ||
          !(
            world.airplaneBodies.has(e.collider) ||
            world.airplaneBodies.has(e.collidedAgainst)
          )
        )
          return;
        const vehicle = Object.values(world.vehicles).find(
          (v) => v.body === e.collider || v.body === e.collidedAgainst || v.trailers.some(cart => cart.body === e.collider || cart.body === e.collidedAgainst),
        );
        if (
          vehicle &&
          vehicle.id !== "crew" &&
          Math.abs(e.impulse) / vehicle.spec.mass > 0.9 &&
          Math.abs(vehicle.pose.speed) > 0.7
        )
          penalize(state, "collision", 60, true);
      });
      await constructScene(prepareSceneMaterials(world.scene), {
        isCancelled: () => signal.aborted || world.disposed,
      });
      await new Promise<void>((resolve, reject) => {
        const cancel = () =>
          reject(new DOMException("Cancelled", "AbortError"));
        signal.addEventListener("abort", cancel, { once: true });
        world.scene.executeWhenReady(() => {
          signal.removeEventListener("abort", cancel);
          resolve();
        });
        if (signal.aborted) cancel();
      });
      return world;
    } catch (error) {
      world.dispose();
      throw error;
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }
  private material(color: string, emissive = false) {
    const key = color + emissive;
    let m = this.materials.get(key);
    if (!m) {
      m = new StandardMaterial(key, this.scene);
      m.diffuseColor = Color3.FromHexString(color);
      m.specularColor.set(0.12, 0.12, 0.12);
      if (emissive) m.emissiveColor = m.diffuseColor.scale(0.65);
      this.materials.set(key, m);
    }
    return m;
  }
  private box(
    name: string,
    size: number[],
    at: number[],
    color: string,
    parent?: TransformNode,
  ) {
    const m = MeshBuilder.CreateBox(
      name,
      { width: size[0], height: size[1], depth: size[2] },
      this.scene,
    );
    m.position.set(at[0], at[1], at[2]);
    m.material = this.material(color);
    if (parent) m.parent = parent;
    m.isPickable = false;
    return m;
  }
  private cylinder(
    name: string,
    diameter: number,
    height: number,
    at: number[],
    color: string,
    parent?: TransformNode,
  ) {
    const m = MeshBuilder.CreateCylinder(
      name,
      { diameter, height, tessellation: 12 },
      this.scene,
    );
    m.position.set(at[0], at[1], at[2]);
    m.material = this.material(color);
    if (parent) m.parent = parent;
    m.isPickable = false;
    return m;
  }
  private sign(
    text: string,
    x: number,
    y: number,
    z: number,
    width: number,
    ground = false,
  ) {
    const texture = new DynamicTexture(
      text,
      { width: 512, height: 128 },
      this.scene,
      true,
    );
    texture.drawText(
      text,
      null,
      89,
      "bold 74px sans-serif",
      "#f1e8d3",
      "#27343a",
      true,
      true,
    );
    this.decals.push(texture);
    const material = new StandardMaterial(text, this.scene);
    material.diffuseTexture = texture;
    material.emissiveColor.set(0.45, 0.45, 0.45);
    material.specularColor.set(0, 0, 0);
    material.backFaceCulling = false;
    const plane = MeshBuilder.CreatePlane(
      text,
      { width, height: width / 4 },
      this.scene,
    );
    plane.material = material;
    plane.position.set(x, y, z);
    if (ground) plane.rotation.x = Math.PI / 2;
    else plane.rotation.y = Math.PI;
    return plane;
  }
  private batchParent(parent: TransformNode) {
    const groups = new Map<StandardMaterial, Mesh[]>();
    for (const mesh of parent.getChildMeshes(true)) {
      if (
        !(mesh instanceof Mesh) ||
        mesh.getChildren().length ||
        mesh.material?.alpha !== 1
      )
        continue;
      const m = mesh.material as StandardMaterial;
      const group = groups.get(m) ?? [];
      group.push(mesh);
      groups.set(m, group);
    }
    for (const group of groups.values())
      if (group.length > 1) {
        const merged = Mesh.MergeMeshes(
          group,
          true,
          true,
          undefined,
          false,
          false,
        );
        if (merged) {
          merged.setParent(parent);
          merged.isPickable = true;
          merged.metadata = parent.metadata;
        }
      }
  }
  private *build() {
    const runwayFixtures = new TransformNode("runway fixtures", this.scene);
    this.box(
      "surrounding meadows",
      [5000, 0.1, 5000],
      [0, -0.65, 0],
      "#819c83",
    );
    const ground = this.box(
      "local ground",
      [250, 1, 260],
      [0, -0.55, 10],
      "#758d7c",
    );
    rigid(ground);
    this.box("apron", [106, 0.08, 93], [0, -0.01, 10], colors.ground);
    this.box("runway", [24, 0.08, 2800], [-64, 0.01, -50], colors.asphalt);
    this.box("taxiway", [66, 0.08, 17], [-31, 0.025, 40], colors.asphalt);
    yield;
    this.box("taxi line", [64, 0.012, 0.24], [-32, 0.08, 40], colors.line);
    for (const x of [-31, 0, 31]) {
      this.box("stand line", [0.18, 0.012, 63], [x, 0.08, 8], colors.line);
      this.box("stop line", [7, 0.012, 0.3], [x, 0.1, -7], colors.line);
      this.sign(`G${x === 0 ? "2" : x < 0 ? "1" : "3"}`, x, 0.13, 19, 6, true);
      yield;
    }
    let centerline: Mesh | undefined, edgeLight: Mesh | undefined;
    for (let z = -1300; z <= 1300; z += 42) {
      if (!centerline)
        centerline = this.box(
          "runway centerline",
          [0.5, 0.012, 14],
          [-64, 0.09, z],
          colors.white,
          runwayFixtures,
        );
      else {
        const mark = centerline.createInstance("runway centerline");
        mark.parent = runwayFixtures;
        mark.position.set(-64, 0.09, z);
        mark.isPickable = false;
        mark.freezeWorldMatrix();
      }
      for (const x of [-74.5, -53.5]) {
        if (!edgeLight) {
          edgeLight = this.box(
            "edge light",
            [0.4, 0.15, 0.4],
            [x, 0.15, z],
            colors.white,
            runwayFixtures,
          );
          edgeLight.material = this.material("#c5eaf0", true);
        } else {
          const lamp = edgeLight.createInstance("edge light");
          lamp.parent = runwayFixtures;
          lamp.position.set(x, 0.15, z);
          lamp.isPickable = false;
          lamp.freezeWorldMatrix();
        }
      }
      yield;
    }
    this.sign("27", -64, 0.12, 10, 10, true);
    for (let i = 0; i < 6; i++)
      this.box(
        "threshold",
        [1, 0.012, 13],
        [-72 + i * 3.1, 0.1, 230],
        colors.white,
      );
    const terminal = this.box(
      "terminal",
      [93, 9, 14],
      [0, 4.5, -34],
      "#b0bcb8",
    );
    rigid(terminal);
    this.box("terminal roof", [96, 0.6, 16], [0, 9.2, -34], "#354f56");
    this.box("terminal canopy", [94, 0.35, 6], [0, 4.5, -25.5], "#deded0");
    for (let x = -44; x <= 44; x += 4) {
      this.box("window", [3.4, 3.2, 0.15], [x, 2.2, -26.91], colors.glass);
      this.box("clerestory", [3.4, 2.5, 0.15], [x, 7, -26.91], "#799fa9");
      yield;
    }
    this.sign("TURNAROUND / REGIONAL", 0, 6.8, -26.7, 30);
    this.sign("BAGGAGE", -24, 3, -26.6, 10);
    this.box("baggage bay", [8, 0.03, 6], [-24, 0.11, -18], "#476563");
    for (const x of [-46, 46]) {
      const tower = this.box(
        "floodlight pole",
        [0.3, 15, 0.3],
        [x, 7.5, -12],
        "#526b70",
      );
      rigid(tower);
      this.box("floodlight", [3, 0.8, 0.5], [x, 15, -12], "#f0e6c6");
    }
    for (let i = 0; i < 12; i++) {
      const x = -44 + i * 8;
      const cone = this.cylinder("cone", 0.45, 0.6, [x, 0.3, -23], colors.orange);
      rigid(cone);
      yield;
    }
    for (const spec of VEHICLES.filter((v) => v.id !== "crew")) {
      for (const side of [-1, 1])
        this.box(
          "equipment parking line",
          [0.09, 0.01, 4.5],
          [spec.at[0] + side * 2, 0.11, spec.at[1]],
          "#718786",
        );
      this.box(
        "equipment parking stop",
        [4, 0.01, 0.1],
        [spec.at[0], 0.11, spec.at[1] + 2.2],
        "#718786",
      );
      yield;
    }
    // Static wet patches carry the second flight's weather without a reflection render pass.
    if (this.state.flight === 2)
      for (let i = 0; i < 16; i++) {
        const puddle = MeshBuilder.CreateDisc(
          "wet asphalt",
          { radius: 1.5 + (i % 3), tessellation: 12 },
          this.scene,
        );
        puddle.position.set(-34 + ((i * 13) % 70), 0.115, -18 + ((i * 7) % 54));
        puddle.rotation.x = Math.PI / 2;
        puddle.scaling.y = 0.35;
        const wet = this.material("#587780");
        wet.specularColor.set(0.6, 0.6, 0.6);
        wet.specularPower = 80;
        wet.backFaceCulling = false;
        puddle.material = wet;
        yield;
      }
    const marshaller = new TransformNode("marshaller", this.scene);
    this.box(
      "marshaller vest",
      [0.6, 0.7, 0.4],
      [0, 0.85, -13],
      colors.violet,
      marshaller,
    );
    this.cylinder(
      "marshaller head",
      0.36,
      0.4,
      [0, 1.45, -13],
      "#deb99a",
      marshaller,
    );
    for (const side of [-1, 1]) {
      this.box(
        "marshaller leg",
        [0.17, 0.6, 0.2],
        [side * 0.18, 0.3, -13],
        colors.dark,
        marshaller,
      );
      const wand = this.box(
        "marshaller wand",
        [0.08, 0.65, 0.08],
        [side * 0.5, 1.4, -13],
        colors.orange,
        marshaller,
      );
      wand.rotation.z = side * 0.6;
    }
    // Thin instances share one draw per repeated family and remain independently animated.
    this.passengers = this.box(
      "passengers",
      [0.32, 1.15, 0.32],
      [0, 0, 0],
      colors.violet,
    );
    this.bags = this.box(
      "flight bags",
      [0.5, 0.36, 0.34],
      [0, 0, 0],
      colors.orange,
    );
    for (const [mesh, count] of [
      [this.passengers, 10],
      [this.bags, 8],
    ] as const) {
      mesh.metadata = { dynamic: true };
      mesh.thinInstanceSetBuffer(
        "matrix",
        new Float32Array(count * 16),
        16,
        false,
      );
      mesh.setEnabled(false);
    }
    yield* this.buildPlane();
    for (const spec of VEHICLES) {
      yield* this.buildVehicle(spec.id);
      yield;
    }
    this.fleet = Object.values(this.vehicles).filter((v) => v.root.isEnabled());
    const gpu = this.box("GPU", [1.1, 0.7, 1.4], [3, 0.5, -9], colors.violet);
    gpu.metadata = { dynamic: true };
    this.gpu = gpu;
    this.chocks = this.box(
      "wheel chock",
      [1.6, 0.25, 0.4],
      [0, 0.17, -4.9],
      colors.orange,
    );
    this.chocks.metadata = { dynamic: true };
    this.marker = MeshBuilder.CreateTorus(
      "dock guide",
      { diameter: 3, thickness: 0.09, tessellation: 32 },
      this.scene,
    );
    this.marker.metadata = { dynamic: true };
    this.marker.position.y = 0.12;
    this.markerMaterial = new StandardMaterial("dock quality", this.scene);
    this.markerMaterial.disableLighting = true;
    this.marker.material = this.markerMaterial;
    this.markerArrow = MeshBuilder.CreateCylinder(
      "dock heading",
      { diameterTop: 0, diameterBottom: 1.2, height: 1.5, tessellation: 3 },
      this.scene,
    );
    this.markerArrow.parent = this.marker;
    this.markerArrow.material = this.markerMaterial;
    this.markerArrow.rotation.x = -Math.PI / 2;
    this.markerArrow.position.z = -2.2;
    yield* staticDecorationSteps(
      this.scene,
      Mesh,
      // Regular instances retain per-object frustum culling. Do not merge their source geometry.
      new Set([
        runwayFixtures,
        this.plane,
        ...Object.values(this.vehicles).map((v) => v.root),
      ]),
    );
  }
  private *buildPlane() {
    const fuselage = MeshBuilder.CreateSphere(
      "fuselage",
      { diameter: 1, segments: 12 },
      this.scene,
    );
    fuselage.scaling.set(2.6, 2.8, 18);
    fuselage.position.y = 2.7;
    fuselage.parent = this.plane;
    fuselage.material = this.material(colors.white);
    const wing = this.box(
      "main wing",
      [21, 0.28, 2.9],
      [0, 3.25, 1],
      colors.white,
      this.plane,
    );
    wing.rotation.z = -0.02;
    for (const side of [-1, 1]) {
      const tip = this.box(
        "wingtip",
        [1.2, 0.3, 2.9],
        [side * 10.2, 3.3, 1],
        colors.violet,
        this.plane,
      );
      tip.rotation.z = side * 0.14;
      const engine = this.cylinder(
        "turboprop engine",
        1.15,
        3.8,
        [side * 4.2, 2.85, -0.2],
        colors.white,
        this.plane,
      );
      engine.rotation.x = Math.PI / 2;
      const prop = new TransformNode("propeller", this.scene);
      prop.parent = this.plane;
      prop.position.set(side * 4.2, 2.85, -2.2);
      this.props.push(prop);
      this.box("propeller", [0.14, 3.5, 0.12], [0, 0, 0], colors.dark, prop);
      this.box("propeller", [3.5, 0.14, 0.12], [0, 0, 0], colors.dark, prop);
      this.box(
        "gear",
        [0.16, 1.6, 0.16],
        [side * 0.9, 0.9, 1.3],
        colors.dark,
        this.plane,
      );
      const wheel = this.cylinder(
        "main wheel",
        0.8,
        0.3,
        [side * 1.1, 0.45, 1.3],
        colors.dark,
        this.plane,
      );
      wheel.rotation.z = Math.PI / 2;
      for (let j = 0; j < 10; j++) {
        this.box(
          "passenger window",
          [0.04, 0.35, 0.48],
          [side * 1.2, 3.25, -4.8 + j * 0.9],
          colors.dark,
          this.plane,
        );
        yield;
      }
      this.box(
        "door",
        [0.045, 1.2, 0.72],
        [side * 1.12, 3.3, -5],
        "#a8b5b6",
        this.plane,
      );
      this.box(
        "wing light",
        [0.2, 0.16, 0.2],
        [side * 10.8, 3.45, 1],
        side < 0 ? "#ef7d79" : "#a3ecc4",
        this.plane,
      );
      yield;
    }
    const tail = this.box(
      "violet tail",
      [0.24, 3.4, 3],
      [0, 5.1, 6.4],
      colors.violet,
      this.plane,
    );
    tail.rotation.x = -0.28;
    this.box(
      "tailplane",
      [7.4, 0.23, 1.8],
      [0, 4.1, 6.6],
      colors.white,
      this.plane,
    );
    this.box(
      "nose gear",
      [0.16, 1.6, 0.16],
      [0, 1, -5.8],
      colors.dark,
      this.plane,
    );
    const nose = this.cylinder(
      "nose wheel",
      0.66,
      0.35,
      [0, 0.4, -5.8],
      colors.dark,
      this.plane,
    );
    nose.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const cockpit = this.box(
        "cockpit",
        [0.95, 0.62, 1.2],
        [side * 0.53, 3.4, -7],
        colors.dark,
        this.plane,
      );
      cockpit.rotation.y = side * -0.2;
    }
    this.batchParent(this.plane);
    this.dent = this.box(
      "damage mark",
      [0.04, 0.75, 1.2],
      [-1.3, 2.5, 0.2],
      "#806f80",
      this.plane,
    );
    this.dent.setEnabled(false);
    yield;
  }
  private *buildVehicle(id: VehicleId) {
    const vehicle = new RampVehicle(this.scene, id);
    this.vehicles[id] = vehicle;
    this.poses[id] = vehicle.pose;
    const root = vehicle.root;
    if (id === "crew") {
      this.box("vest", [0.48, 0.65, 0.36], [0, 0.05, 0], colors.violet, root);
      this.cylinder("head", 0.32, 0.35, [0, 0.57, 0], "#deb99a", root);
      for (const x of [-0.15, 0.15])
        this.box("leg", [0.16, 0.45, 0.18], [x, -0.4, 0], colors.dark, root);
      this.box(
        "reflective band",
        [0.49, 0.09, 0.38],
        [0, 0.04, 0],
        colors.line,
        root,
      );
    } else {
      const long = id === "fuel" ? 4.8 : id === "stairs" ? 3.8 : 3;
      this.box(
        "chassis",
        [1.6, 0.35, long],
        [0, -0.15, 0],
        colors.violet,
        root,
      );
      if (id !== "stairs" && id !== "belt") {
      this.box(
        "cab",
        [1.5, 1, 1.1],
        [0, 0.5, -long / 2 + 0.55],
        colors.white,
        root,
      );
      this.box(
        "windshield",
        [1.3, 0.5, 0.04],
        [0, 0.68, -long / 2 - 0.02],
        colors.glass,
        root,
      );
      }
      for (const side of [-1, 1])
        for (const end of [-1, 1]) {
          const wheel = this.cylinder(
            "wheel",
            0.68,
            0.26,
            [side * 0.86, -0.26, end * (long / 2 - 0.5)],
            colors.dark,
            root,
          );
          wheel.rotation.z = Math.PI / 2;
        }
      if (id !== "stairs" && id !== "belt") {
      this.box(
        "beacon",
        [0.28, 0.18, 0.25],
        [0, 1.07, -long / 2 + 0.55],
        colors.orange,
        root,
      );
      }
      if (id === "fuel" || id === "water") {
        const tank = this.cylinder(
          "tank",
          1.65,
          long - 1.2,
          [0, 0.65, 0.55],
          id === "fuel" ? colors.violet : colors.white,
          root,
        );
        tank.rotation.x = Math.PI / 2;
      }
      if (id === "stairs") {
        // Normalized rise: Q/E changes the incline while the bottom remains on the apron.
        for (let i = 0; i < STAIR_STEPS; i++) {
          this.box("stair tread", [1.4, 0.045, 0.3], [0, (i + 1) / STAIR_STEPS - 0.0225, 1.6 - i * 0.3], colors.white, vehicle.platform);
          yield;
        }
        this.box("door landing", [1.5, 0.05, 0.6], [0, 0.975, -1.95], colors.white, vehicle.platform);
        for (const side of [-1, 1]) {
          for (const [y, color] of [[0.47, colors.white], [0.88, colors.violet]] as const) {
            const rail = this.box("stair stringer / handrail", [0.07, 0.035, Math.hypot(3.6, 1)], [side * 0.72, y, -0.05], color, vehicle.platform);
            rail.rotation.x = Math.atan2(1, 3.6);
          }
          for (const i of [0, 4, 8, 11])
            this.box("handrail post", [0.055, 0.38, 0.055], [side * 0.72, (i + 1) / STAIR_STEPS + 0.17, 1.6 - i * 0.3], colors.violet, vehicle.platform);
          this.box("landing rail", [0.06, 0.04, 0.6], [side * 0.72, 1.35, -1.95], colors.violet, vehicle.platform);
        }
      }
      if (id === "belt") {
        const belt = this.box("conveyor", [1, 0.14, Math.hypot(4, 1)], [0, 0.5, -0.3], colors.dark, vehicle.platform);
        belt.rotation.x = Math.atan2(1, 4);
        for (const side of [-1, 1]) {
          const rail = this.box("conveyor edge", [0.07, 0.18, Math.hypot(4, 1)], [side * 0.54, 0.55, -0.3], colors.violet, vehicle.platform);
          rail.rotation.x = Math.atan2(1, 4);
        }
      }
      if (id === "catering") {
        this.box(
          "lift body",
          [1.8, 1.2, 2.5],
          [0, 0.65, 0.55],
          colors.white,
          vehicle.platform,
        );
        this.box(
          "platform",
          [1.8, 0.16, 3.4],
          [0, 0, 0],
          colors.violet,
          vehicle.platform,
        );
        this.box(
          "door bridge",
          [1.4, 0.1, 2.1],
          [0, 0, -2.4],
          colors.white,
          vehicle.platform,
        );
      }
      if (id === "push")
        this.box("ballast", [2.3, 0.6, 3.3], [0, 0.25, 0], colors.violet, root);
      if (id === "tug") {
        this.box("rear hitch", [0.15, 0.15, 0.5], [0, -0.2, 1.45], colors.dark, root);
        for (const trailer of vehicle.trailers) {
          const cart = trailer.root;
          this.box("cart deck", [1.7, 0.18, 2.2], [0, -0.25, 0], colors.violet, cart);
          this.box("cart drawbar", [0.15, 0.15, 0.55], [0, -0.2, -1.375], colors.dark, cart);
          for (const side of [-1, 1]) {
            for (const z of [-0.7, 0.7]) {
              const wheel = this.cylinder("cart wheel", 0.55, 0.22, [side * 0.82, -0.325, z], colors.dark, cart);
              wheel.rotation.z = Math.PI / 2;
            }
            this.box("cart side", [0.06, 0.6, 2.2], [side * 0.82, 0.08, 0], colors.white, cart);
          }
          for (let i = 0; i < 3; i++)
            this.box("suitcase", [0.63, 0.5 + (i % 2) * 0.15, 0.55], [i % 2 ? -0.34 : 0.34, 0.12, -0.65 + i * 0.65], i % 2 ? colors.violet : colors.orange, cart);
          this.batchParent(cart);
          yield;
        }
      }
    }
    this.batchParent(root);
    this.batchParent(vehicle.platform);
    if (this.state.flight === 1 && ["fuel", "catering", "water"].includes(id)) {
      root.setEnabled(false);
      vehicle.body.shape!.filterCollideMask = 0;
      vehicle.body.setMotionType(PhysicsMotionType.STATIC);
    }
    yield;
  }
  private updateColliders() {
    if (this.state.phase === this.previousPhase) return;
    this.physicsActive = true;
    this.settledFor = 0;
    this.previousPhase = this.state.phase;
    this.colliders.forEach((m) => m.dispose());
    this.colliders = [];
    this.airplaneBodies.clear();
    if (this.state.phase !== "service" && this.state.phase !== "pushback") return;
    this.colliders = buildAircraftColliders(this.scene);
    for (const mesh of this.colliders) this.airplaneBodies.add(mesh.physicsBody!);
  }
  step(dt: number, selected: VehicleId, keys: Set<string>) {
    const s = this.state;
    this.updateColliders();
    if (s.phase !== "service" && !(s.phase === "pushback" && !s.pushConnected))
      return;
    const controlled = this.hasDriveInput(selected, keys);
    if (!this.physicsActive && !controlled) return;
    this.physicsActive = true;
    const axis = (a: string, b: string) =>
      Number(keys.has(a)) - Number(keys.has(b));
    for (const v of this.fleet) {
      const active = v.id === selected;
      v.beforeStep(
        dt,
        active ? axis("KeyW", "KeyS") : 0,
        active ? axis("KeyD", "KeyA") : 0,
        !active || keys.has("Space"),
        active ? axis("KeyE", "KeyQ") : 0,
        s.flight === 2,
        Boolean(s.attached[v.id]),
      );
    }
    this.scene.getPhysicsEngine()!._step(dt);
    let settled = !controlled;
    for (const v of this.fleet) {
      v.sync();
      if (!v.settled) settled = false;
    }
    this.settledFor = settled ? this.settledFor + dt : 0;
    // Sleep the whole physical scene only after every body remains at rest.
    // Passenger/bag visuals and service clocks continue independently.
    if (this.settledFor >= 0.4) this.physicsActive = false;

  }
  hasDriveInput(selected: VehicleId, keys: Set<string>) {
    return (
      !this.state.attached[selected] &&
      (keys.has("KeyW") ||
        keys.has("KeyS") ||
        keys.has("KeyA") ||
        keys.has("KeyD") ||
        keys.has("KeyQ") ||
        keys.has("KeyE"))
    );
  }
  pick(x: number, y: number): VehicleId | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const hit = this.scene.pick(
      ((x - rect.left) * this.engine.getRenderWidth()) / rect.width,
      ((y - rect.top) * this.engine.getRenderHeight()) / rect.height,
    );
    let node = hit?.pickedMesh as TransformNode | null;
    while (node) {
      if (node.metadata?.vehicle) return node.metadata.vehicle;
      node = node.parent as TransformNode | null;
    }
  }
  render(
    dt: number,
    selected: VehicleId,
    task: Task | undefined,
    overview: boolean,
  ) {
    const s = this.state,
      p = s.plane;
    if (overview) {
      this.plane.position.set(0, 0, 0);
      this.plane.rotation.set(0, 0, 0);
    } else {
      this.plane.position.set(p.x, p.y, p.z);
      this.plane.rotation.set(-p.pitch, -p.heading, -p.roll);
    }
    const flight =
      ["approach", "rollout", "takeoff"].includes(s.phase) && !overview;
    if (flight) {
      this.camera.mode = Camera.PERSPECTIVE_CAMERA;
      this.camera.fov = 0.85;
      this.camera.position.set(p.x + (this.reduced ? 0 : 2), p.y + 8, p.z + 30);
      this.cameraTarget.set(p.x, p.y + 1.5, p.z - 50);
      this.camera.setTarget(this.cameraTarget);
    } else {
      this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
      const size = overview
        ? 48
        : s.phase === "service" || s.phase === "pushback"
          ? 24
          : 42;
      this.camera.orthoLeft = -size * this.aspect;
      this.camera.orthoRight = size * this.aspect;
      this.camera.orthoTop = size;
      this.camera.orthoBottom = -size;
      const pos = overview
        ? { x: 0, z: 0 }
        : s.phase === "service" || (s.phase === "pushback" && !s.pushConnected)
          ? this.poses[selected]
          : p;
      // Fixed ramp angle; modest follow keeps the aircraft and current work visible together.
      const x = s.phase === "service" ? pos.x * 0.55 : pos.x,
        z = s.phase === "service" ? pos.z * 0.55 : pos.z;
      this.cameraTarget.set(x, 0, z);
      this.target.set(x + 40, 55, z + 52);
      this.camera.position.copyFrom(this.target);
      this.camera.setTarget(this.cameraTarget);
    }
    const engines = s.phase !== "service" && !overview;
    if (s.phase === "pushback" && s.pushConnected) {
      this.vehicles.push.root.position.set(
        p.x - Math.sin(p.heading) * 11.5,
        0.7,
        p.z - Math.cos(p.heading) * 11.5,
      );
      Quaternion.RotationYawPitchRollToRef(
        -p.heading + Math.PI,
        0,
        0,
        this.vehicles.push.root.rotationQuaternion!,
      );
    }
    for (const prop of this.props)
      if (engines && !this.reduced) prop.rotation.z += dt * 32;
    this.dent.setEnabled(s.damage > 0);
    this.gpu.setEnabled(done(s, "secure") && !done(s, "removeGpu"));
    this.chocks.setEnabled(done(s, "secure") && !done(s, "removeChocks"));
    this.marker.setEnabled(!overview && Boolean(task) && !flight);
    if (task) {
      this.marker.position.set(task.at[0], 0.16, task.at[1]);
      this.marker.rotation.y = -(task.heading ?? 0);
      this.markerArrow.setEnabled(task.heading !== undefined);
      const quality = dockQuality(task, this.poses[selected]);
      this.markerMaterial.emissiveColor.copyFrom(this.markerColors[quality]);
    }
    const passengerTask =
      s.tasks.deplane.status === "running"
        ? s.tasks.deplane
        : s.tasks.board.status === "running"
          ? s.tasks.board
          : undefined;
    this.passengers.setEnabled(Boolean(passengerTask) && s.phase === "service");
    if (passengerTask) {
      const stairs = this.poses.stairs;
      const sin = Math.sin(stairs.heading), cos = Math.cos(stairs.heading);
      for (let i = 0; i < 10; i++) {
        let t = (passengerTask.elapsed / 12 + i / 10) % 1;
        if (s.tasks.board.status === "running") t = 1 - t;
        if (t < 0.25) {
          const down = t / 0.25;
          const localZ = -1.95 + down * 3.55;
          this.point.set(stairs.x - sin * localZ, stairs.height + (0.3 - stairs.height) * down + 0.6, stairs.z + cos * localZ);
        } else {
          const walk = (t - 0.25) / 0.75;
          const x = stairs.x - sin * 1.6, z = stairs.z + cos * 1.6;
          this.point.set(x + (-14 - x) * walk, 0.9 - Math.min(1, walk * 8) * 0.3, z + (-25 - z) * walk);
        }
        Matrix.ComposeToRef(this.scale, this.rotation, this.point, this.matrix);
        this.passengers.thinInstanceSetMatrixAt(i, this.matrix, i === 9);
      }
      this.passengers.thinInstanceRefreshBoundingInfo();
    }
    const baggageTask =
      s.tasks.unload.status === "running"
        ? s.tasks.unload
        : s.tasks.load.status === "running"
          ? s.tasks.load
          : undefined;
    this.bags.setEnabled(Boolean(baggageTask) && s.phase === "service");
    if (baggageTask) {
      const belt = this.poses.belt;
      const sin = Math.sin(belt.heading), cos = Math.cos(belt.heading);
      for (let i = 0; i < 8; i++) {
        let t = (baggageTask.elapsed / 6 + i / 8) % 1;
        if (s.tasks.load.status === "running") t = 1 - t;
        const localZ = -2.3 + t * 4;
        this.point.set(belt.x - sin * localZ, belt.height + (0.55 - belt.height) * t + 0.26, belt.z + cos * localZ);
        Matrix.ComposeToRef(this.scale, this.rotation, this.point, this.matrix);
        this.bags.thinInstanceSetMatrixAt(i, this.matrix, i === 7);
      }
      this.bags.thinInstanceRefreshBoundingInfo();
    }
    this.scene.render();
    recordRenderedFrame();
  }
  resize() {
    if (this.disposed) return;
    const r = this.canvas.getBoundingClientRect();
    this.aspect = r.width / Math.max(1, r.height);
    this.engine.setHardwareScalingLevel(
      renderScale(r.width, r.height, devicePixelRatio),
    );
    this.engine.resize();
    this.onInvalidate();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.observer.disconnect();
    this.decals.forEach((t) => t.dispose());
    this.scene.dispose();
    this.engine.dispose();
    this.canvas
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  }
}
