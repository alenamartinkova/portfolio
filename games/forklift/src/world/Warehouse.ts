import { t } from "../i18n";
import {
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  Scene,
  ShadowGenerator,
  Vector3,
} from "@babylonjs/core";
import { Factory } from "./Factory";
import { rigid } from "../systems/Physics";
export interface PropertyObject {
  mesh: Mesh;
  value: number;
  start: Vector3;
  breakMass?: number;
  breakGroup?: string;
}
export class Warehouse {
  property: PropertyObject[] = [];
  cameraObstacles = new Set<Mesh>();
  shadow: ShadowGenerator;
  constructor(
    public scene: Scene,
    public f: Factory,
  ) {
    scene.clearColor = Color4.FromHexString("#95b9caff");
    scene.ambientColor = new Color3(0.2, 0.24, 0.28);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.008;
    scene.fogColor = new Color3(0.55, 0.68, 0.73);
    const hemi = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.72;
    hemi.groundColor = Color3.FromHexString("#687679");
    const sun = new DirectionalLight(
      "skylight",
      new Vector3(-0.6, -1, 0.45),
      scene,
    );
    sun.position.set(10, 22, -14);
    sun.intensity = 0.95;
    this.shadow = new ShadowGenerator(2048, sun);
    this.shadow.usePercentageCloserFiltering = true;
    this.shadow.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    this.shadow.blurKernel = 24;
    this.shadow.darkness = 0.25;
    sun.shadowMinZ = 1;
    sun.shadowMaxZ = 65;
    this.solid("concrete floor", [36, 1, 42], [0, -0.5, 0], "#8e9b9c");
    for (let x = -16; x <= 16; x += 4)
      f.box("concrete joint", [0.022, 0.005, 42], [x, 0.006, 0], "#7e8e91");
    for (let z = -18; z <= 18; z += 4)
      f.box("concrete joint", [36, 0.005, 0.022], [0, 0.006, z], "#7e8e91");
    this.solid("back wall", [36, 8, 0.5], [0, 4, 21], "#bac4c5", true);
    this.solid("left wall", [0.5, 8, 42], [-18, 4, 0], "#a2b5bd", true);
    this.solid("right wall", [0.5, 8, 42], [18, 4, 0], "#a2b5bd", true);
    this.solid("front wall", [36, 4, 0.5], [0, 2, -21], "#a2b5bd", true);
    for (let z = -18; z < 21; z += 6) {
      for (const x of [-17.5, 17.5]) {
        f.box("steel column", [0.36, 8, 0.42], [x, 4, z], "#334d5e");
        f.box("wall rail", [0.3, 0.12, 6], [x, 3, z + 3], "#6b8590");
      }
      f.box("roof truss", [35, 0.32, 0.24], [0, 8, z], "#506a76");
      for (const x of [-11, 0, 11]) {
        const light = f.box(
          "strip light",
          [3.3, 0.055, 0.3],
          [x, 7.8, z],
          "#edffff",
        );
        light.material = f.mat("#edffff", true);
      }
    }
    for (let i = 0; i < 2; i++) {
      const x = -8 + i * 16;
      f.box("bay shutter", [7, 5, 0.12], [x, 2.5, 20.68], "#516a76");
      for (let y = 0.3; y < 5; y += 0.35)
        f.box("shutter slat", [6.8, 0.025, 0.06], [x, y, 20.56], "#789099");
      f.label(
        () => `${t("loadingBay")} ${String.fromCharCode(65 + i)}`,
        7,
        0.75,
        [x, 5.65, 20.4],
      );
      for (const bx of [x - 3.8, x + 3.8]) this.bollard(bx, 19.4);
    }
    f.label("NORTHLINE  /  LOGISTICS", 12, 1.1, [-7, 6.7, 20.4]);
    f.label("B", 2, 2, [8, 3.8, 20.35], "#94efd2", "#264d4d");
    this.zone(0, -5, 5, 4, "#579ac6", () => t("pickupSign"));
    this.zone(8, 15, 6, 5, "#77d9bc", () => t("deliverySign"));
    // A broad center aisle with an offset gate makes the load worth steering carefully.
    for (const x of [-13, 13]) for (const z of [-10, 0, 10]) this.rack(x, z);
    this.rack(-3, 4);
    this.rack(3, 4);
    for (let z = -15; z < 18; z += 3)
      for (const x of [-8, 8])
        f.box(
          "aisle dashed line",
          [0.1, 0.008, 1.45],
          [x, 0.011, z],
          "#e9d9a2",
        );
    f.label("02", 2.5, 1.5, [-8, 0.018, -13], "#d5dfd9", "#8e9b9c", true);
    f.label("B  ↑", 2.2, 1.5, [8, 0.018, 9], "#d1fff0", "#6c9e97", true);
    for (const [x, z] of [
      [-5, -9],
      [5, -1],
      [-8, 13],
      [14, 17],
    ])
      this.barrier(x, z);
    for (const [x, z] of [
      [-10, -16],
      [-9, -16],
      [11, -5],
      [11, 3],
      [-7, 9],
    ])
      this.crate(x, 0.5, z, 1);
    for (const [x, z] of [
      [4, 9],
      [-7, -1],
      [11, -13],
    ]) {
      const p = f.box(
        "loose pallet",
        [2.2, 0.23, 1.6],
        [x, 0.12, z],
        "#b58f5d",
      );
      rigid(p, 25);
      this.property.push({ mesh: p, value: 70, start: p.position.clone() });
      for (let i = 0; i < 6; i++)
        f.box(
          "pallet seam",
          [0.025, 0.006, 1.6],
          [-0.92 + i * 0.36, 0.119, 0],
          "#6f5639",
          p,
        );
    }
    for (const [x, z] of [
      [6, -9],
      [-6, -1],
      [10, 13],
    ]) {
      const base = f.box(
        "cone base",
        [0.55, 0.08, 0.55],
        [x, 0.045, z],
        "#26353e",
      );
      rigid(base, 3);
      const cone = f.cylinder(
        "safety cone",
        0.35,
        0.65,
        [0, 0.36, 0],
        "#e98f44",
        base,
      );
      cone.scaling.x = 0.85;
      this.property.push({
        mesh: base,
        value: 25,
        start: base.position.clone(),
      });
    }
  }
  private solid(
    n: string,
    s: number[],
    p: number[],
    c: string,
    camera = false,
  ) {
    const m = this.f.box(n, s, p, c);
    rigid(m);
    if (n === "rack upright" || n === "rack deck")
      this.property.push({
        mesh: m,
        value: n === "rack upright" ? 180 : 250,
        start: m.position.clone(),
        breakMass: n === "rack upright" ? 45 : 90,
      });
    if (camera) this.cameraObstacles.add(m);
    return m;
  }
  private zone(
    x: number,
    z: number,
    w: number,
    d: number,
    c: string,
    title: string | (() => string),
  ) {
    this.f.box("zone tint", [w, 0.008, d], [x, 0.012, z], c);
    for (const side of [-1, 1]) {
      this.f.box(
        "zone border",
        [0.065, 0.015, d],
        [x + (side * w) / 2, 0.024, z],
        "#e9fff6",
      );
      this.f.box(
        "zone border",
        [w, 0.015, 0.065],
        [x, 0.024, z + (side * d) / 2],
        "#e9fff6",
      );
    }
    this.f.label(
      title,
      w - 0.3,
      0.6,
      [x, 0.03, z - d / 2 + 0.5],
      "#ecfffa",
      c,
      true,
    );
  }
  private bollard(x: number, z: number) {
    this.solid("bollard", [0.28, 1.2, 0.28], [x, 0.6, z], "#ebbd54");
    this.f.box("bollard band", [0.29, 0.2, 0.29], [x, 0.8, z], "#34434c");
  }
  private barrier(x: number, z: number) {
    this.solid("safety rail", [2.6, 0.18, 0.18], [x, 0.85, z], "#f0b848");
    for (const dx of [-1.15, 1.15]) this.bollard(x + dx, z);
  }
  private rack(x: number, z: number) {
    const f = this.f;
    const firstPart = this.property.length;
    for (const dx of [-2.15, 2.15])
      for (const dz of [-0.9, 0.9])
        this.solid(
          "rack upright",
          [0.14, 4.8, 0.14],
          [x + dx, 2.4, z + dz],
          "#345469",
          true,
        );
    for (const y of [0.2, 2.15, 4.1]) {
      const deck = this.solid(
        "rack deck",
        [4.4, 0.13, 2],
        [x, y, z],
        "#6b8993",
      );
      for (const dz of [-1, 1])
        f.box(
          "orange rack beam",
          [4.5, 0.23, 0.1],
          [0, 0, dz],
          "#cf7c3e",
          deck,
        );
    }
    for (const y of [0.8, 2.8])
      for (const dx of [-1.35, 0, 1.35]) this.crate(x + dx, y, z, 1.05);
    const parts = this.property.slice(firstPart).filter((p) => p.breakMass);
    for (const part of parts) part.breakGroup = `rack-${x}-${z}`;
    f.label(
      `${x < 0 ? "A" : "C"}-${Math.abs(z) + 1}`,
      1,
      0.35,
      [0, -0.6, -1.03],
      "#1b3340",
      "#e6dcb9",
      false,
      parts[parts.length - 1].mesh,
    );
  }
  private crate(x: number, y: number, z: number, size: number) {
    const m = this.f.box("carton", [size, size, size], [x, y, z], "#bc966c");
    rigid(m, 12);
    this.property.push({ mesh: m, value: 85, start: m.position.clone() });
    this.f.box(
      "packing tape",
      [0.18, size + 0.008, size + 0.008],
      [0, 0, 0],
      "#e0c7a0",
      m,
    );
    this.f.label(
      "↑ ↑",
      0.38,
      0.24,
      [0.18, 0, -size / 2 - 0.006],
      "#594b3d",
      "#bc966c",
      false,
      m,
    );
    return m;
  }
  finishShadows() {
    for (const m of this.scene.meshes)
      if (
        m.name !== "concrete floor" &&
        !m.name.includes("wall") &&
        m.getTotalVertices() > 0
      )
        this.shadow.addShadowCaster(m);
  }
}
