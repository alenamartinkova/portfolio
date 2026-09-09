import { onLocaleChange } from "../i18n";
import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
export class Factory {
  private mats = new Map<string, StandardMaterial>();
  constructor(public scene: Scene) {}
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
    const m = MeshBuilder.CreateBox(
      name,
      { width: size[0], height: size[1], depth: size[2] },
      this.scene,
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.material = this.mat(color);
    m.parent = parent ?? null;
    m.receiveShadows = true;
    return m;
  }
  cylinder(
    name: string,
    diameter: number,
    height: number,
    pos: number[],
    color: string,
    parent?: TransformNode,
  ) {
    const m = MeshBuilder.CreateCylinder(
      name,
      { diameter, height, tessellation: 12 },
      this.scene,
    );
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
      false,
    );
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
    const m = MeshBuilder.CreatePlane(name, { width, height }, this.scene);
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
