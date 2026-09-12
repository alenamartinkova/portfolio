import { Color3 } from '@babylonjs/core/Maths/math.color';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';

type Surface = 'concrete' | 'wood' | 'cardboard' | 'metal' | 'enamel';

/** Shared, mipmapped surface maps. Grain stays subtle and filtered at a distance. */
export class SurfaceMaterials {
  private materials = new Map<string, PBRMaterial>();
  private textures = new Map<Surface, Texture>();
  constructor(private scene: Scene) {}

  apply(mesh: Mesh, name: string, color: string) {
    const kind: Surface | undefined = /concrete|wall plinth/.test(name) ? 'concrete'
      : /pallet|wood/.test(name) ? 'wood'
      : /carton|parcel$|reserve stock/.test(name) ? 'cardboard'
      : /piano cabinet|piano lid|piano lower|piano leg/.test(name) ? 'enamel'
      : /rack|shelf|steel column|roof truss|wall rail|shutter|bollard|safety rail|wall panel|generator|corner guard|evaporator/.test(name) ? 'metal' : undefined;
    if (!kind) return;
    const key = `${kind}:${color}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new PBRMaterial(key, this.scene);
      material.albedoColor = Color3.FromHexString(color).toLinearSpace();
      material.metallic = kind === 'metal' ? .12 : kind === 'enamel' ? .15 : 0;
      material.roughness = { concrete: .88, wood: .84, cardboard: .95, metal: .57, enamel: .24 }[kind];
      material.environmentIntensity = kind === 'concrete' || kind === 'enamel' ? .15 : .3;
      if (kind === 'enamel') {
        material.clearCoat.isEnabled = true;
        material.clearCoat.intensity = .6;
      }
      if (kind === 'concrete' || kind === 'wood' || kind === 'cardboard') material.albedoTexture = this.texture(kind);
      this.materials.set(key, material);
    }
    mesh.material = material;
    if (!material.albedoTexture) return;
    // Project UVs in local metres, keeping the grain's scale consistent on crates,
    // long pallet slats and the floor instead of stretching one image per object.
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
    const normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
    const uv: number[] = [];
    const scale = kind === 'concrete' ? .25 : kind === 'wood' ? 1.5 : 1;
    for (let i = 0; i < positions.length; i += 3) {
      const x = Math.abs(normals[i]), y = Math.abs(normals[i + 1]), z = Math.abs(normals[i + 2]);
      const u = y >= x && y >= z ? positions[i] : x > z ? positions[i + 2] : positions[i];
      const v = y >= x && y >= z ? positions[i + 2] : positions[i + 1];
      uv.push(u * scale, v * scale);
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uv);
  }

  private texture(kind: Surface) {
    if (!this.scene.getEngine().getRenderingCanvas()) return null;
    const existing = this.textures.get(kind);
    if (existing) return existing;
    const size = 256, pixels = new Uint8Array(size * size * 4);
    let seed = 713;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 4294967296 - .5;
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
      let value: number;
      if (kind === 'wood') {
        const grain = Math.sin(v * 30 + Math.sin(u * 2) * 1.4 + Math.sin(v * 3));
        value = 224 + grain * 12 + Math.sin(v * 7 + u) * 7 + noise * 5;
      } else if (kind === 'concrete') {
        const mottle = Math.sin(u + Math.sin(v * 2)) * Math.cos(v + Math.sin(u * 3));
        value = 243 + mottle * 3 + Math.sin(u * 8 + v * 5) * .5 + noise * 2;
      } else {
        value = 239 + Math.sin(v * 80) * 2 + noise * 7;
      }
      const i = (y * size + x) * 4;
      pixels[i] = value; pixels[i + 1] = value; pixels[i + 2] = value; pixels[i + 3] = 255;
    }
    const texture = RawTexture.CreateRGBATexture(pixels, size, size, this.scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
    texture.name = `${kind} grain`;
    texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = 8;
    this.textures.set(kind, texture);
    return texture;
  }
}
