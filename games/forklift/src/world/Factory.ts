import { onLocaleChange } from "../i18n";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
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
    const m = CreateBox(
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
  beveledBox(name: string, size: number[], pos: number[], color: string, parent?: TransformNode) {
    const [w, h, d] = size.map(v => v / 2);
    const bevel = Math.min(.13, h * .4, w * .25, d * .25);
    const positions: number[] = [], indices: number[] = [], normals: number[] = [];
    // Four octagonal rings give the body rounded corners and sloped top/bottom edges.
    for (const [y, inset] of [[-h, bevel], [-h + bevel, 0], [h - bevel, 0], [h, bevel]]) {
      const x = w - inset, z = d - inset, corner = Math.min(.18, x * .3, z * .3);
      for (const [px, pz] of [[-x + corner, -z], [x - corner, -z], [x, -z + corner], [x, z - corner], [x - corner, z], [-x + corner, z], [-x, z - corner], [-x, -z + corner]])
        positions.push(px, y, pz);
    }
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 8; i++) {
      const a = ring * 8 + i, b = ring * 8 + (i + 1) % 8;
      indices.push(a, b, a + 8, b, b + 8, a + 8);
    }
    for (let i = 1; i < 7; i++) indices.push(0, i + 1, i, 24, 24 + i, 25 + i);
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData();
    data.positions = positions; data.indices = indices; data.normals = normals;
    const mesh = new Mesh(name, this.scene);
    data.applyToMesh(mesh);
    mesh.convertToFlatShadedMesh();
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.material = this.mat(color);
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
      { diameter, height, tessellation: 12 },
      this.scene,
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.material = this.mat(color);
    m.parent = parent ?? null;
    m.receiveShadows = true;
    return m;
  }
  lathe(name: string, profile: readonly (readonly [number, number])[], pos: number[], color: string, parent?: TransformNode) {
    const m = CreateLathe(name, { shape: profile.map(([radius, y]) => new Vector3(radius, y, 0)), tessellation: 24, sideOrientation: Mesh.DOUBLESIDE }, this.scene);
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
