import { onLocaleChange } from "../i18n";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { roundedSolid } from "../player/TruckGeometry";
import { SurfaceMaterials } from "./SurfaceMaterials";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { CreateLathe } from '@babylonjs/core/Meshes/Builders/latheBuilder';
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
export class Factory {
  private mats = new Map<string, StandardMaterial>();
  private surfaces: SurfaceMaterials;
  constructor(public scene: Scene) { this.surfaces = new SurfaceMaterials(scene); }
  mat(color: string, glow = false) {
    const key = color + glow;
    let m = this.mats.get(key);
    if (!m) {
      m = new StandardMaterial(key, this.scene);
      m.diffuseColor = Color3.FromHexString(color);
      m.specularColor = new Color3(0.13, 0.15, 0.16);
      if (glow) m.emissiveColor = m.diffuseColor.scale(0.65);
      this.mats.set(key, m);
    }
    return m;
  }
  box(
    name: string,
    size: number[],
    pos: number[],
    color: string,
    parent?: TransformNode,
  ) {
    const rounded = /carton|parcel$|reserve stock|pallet|piano|rack|shelf|steel column|roof truss|shutter|safety rail|bollard|generator|evaporator/.test(name)
      && Math.min(...size) >= .045;
    const m = rounded ? roundedSolid(name, size, Math.min(.035, Math.min(...size) * .18), this.scene) : CreateBox(
      name,
      { width: size[0], height: size[1], depth: size[2] },
      this.scene,
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.material = this.mat(color);
    this.surfaces.apply(m, name, color);
    m.parent = parent ?? null;
    m.receiveShadows = true;
    return m;
  }
  beveledBox(name: string, size: number[], pos: number[], color: string, parent?: TransformNode) {
    const mesh = roundedSolid(name, size, Math.min(.09, Math.min(...size) * .2), this.scene);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.material = this.mat(color);
    this.surfaces.apply(mesh, name, color);
    mesh.parent = parent ?? null;
    mesh.receiveShadows = true;
    return mesh;
  }
  cylinder(
    name: string,
    diameter: number,
    height: number,
    pos: number[],
    color: string,
    parent?: TransformNode,
  ) {
    const m = CreateCylinder(
      name,
      { diameter, height, tessellation: 40 },
      this.scene,
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.material = this.mat(color);
    m.parent = parent ?? null;
    m.receiveShadows = true;
    return m;
  }
  lathe(name: string, profile: readonly (readonly [number, number])[], pos: number[], color: string, parent?: TransformNode) {
    const m = CreateLathe(name, { shape: profile.map(([radius, y]) => new Vector3(radius, y, 0)), tessellation: 48, sideOrientation: Mesh.DOUBLESIDE }, this.scene);
    m.position.set(pos[0], pos[1], pos[2]);
    m.material = this.mat(color);
    m.parent = parent ?? null;
    m.receiveShadows = true;
    return m;
  }
  label(
    text: string | (() => string),
    width: number,
    height: number,
    pos: number[],
    color = "#eef4ef",
    background = "#203440",
    floor = false,
    parent?: TransformNode,
  ) {
    const name = typeof text === "function" ? text() : text;
    const tex = new DynamicTexture(
      name,
      { width: 1024, height: Math.round((1024 * height) / width) },
      this.scene,
      true,
      Texture.TRILINEAR_SAMPLINGMODE,
    );
    tex.anisotropicFilteringLevel = 16;
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    const draw = () => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, tex.getSize().width, tex.getSize().height);
      ctx.font = `bold ${Math.round(tex.getSize().height * 0.56)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(
        typeof text === "function" ? text() : text,
        512,
        tex.getSize().height * 0.54,
        980,
      );
      tex.update();
    };
    draw();
    if (typeof text === "function") {
      const unsubscribe = onLocaleChange(draw);
      this.scene.onDisposeObservable.addOnce(unsubscribe);
    }
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveColor = new Color3(0.25, 0.25, 0.25);
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    const m = CreatePlane(name, { width, height }, this.scene);
    m.material = mat;
    m.position.set(pos[0], pos[1], pos[2]);
    if (floor) m.rotation.x = Math.PI / 2;
    m.parent = parent ?? null;
    m.isPickable = false;
    return m;
  }
  compound(name: string, parts: Mesh[], pos: Vector3) {
    const root = new TransformNode(name, this.scene);
    root.position.copyFrom(pos);
    root.rotationQuaternion = Quaternion.Identity();
    for (const p of parts) p.parent = root;
    return root;
  }
}
