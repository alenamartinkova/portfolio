import { Color3 } from '@babylonjs/core/Maths/math.color';
import { SphericalPolynomial } from '@babylonjs/core/Maths/sphericalPolynomial';
import { Constants } from '@babylonjs/core/Engines/constants';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';

type Surface = 'paint' | 'wood' | 'fabric' | 'metal' | 'paper' | 'skin' | 'glass';

/** Locally generated, filtered materials: no external assets or reflection passes. */
export class OfficeMaterials {
  private materials = new Map<string, PBRMaterial>();
  private textures = new Map<Surface, Texture>();
  constructor(private scene: Scene) {
    if (!scene.getEngine().getRenderingCanvas()) return;
    const size = 32;
    const faces = Array.from({length: 6}, (_, face) => {
      const pixels = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const window = face !== 3 && y > 4 && y < 19 && x > 3 && x < 28 && x % 8 > 1;
        const value = face === 3 ? 42 : window ? 200 : 78;
        const i = (y * size + x) * 4;
        pixels[i] = value; pixels[i + 1] = value * .98; pixels[i + 2] = value * .93; pixels[i + 3] = 255;
      }
      return pixels;
    });
    const env = new RawCubeTexture(scene, faces, size, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_UNSIGNED_BYTE, true);
    env.name = 'office window reflections';
    env.gammaSpace = true;
    const irradiance = new SphericalPolynomial();
    irradiance.xx.set(.18, .19, .21); irradiance.yy.set(.18, .19, .21); irradiance.zz.set(.18, .19, .21);
    env.sphericalPolynomial = irradiance;
    scene.environmentTexture = env;
    scene.onDisposeObservable.addOnce(() => env.dispose());
  }
  mat(color: string, glow = false, surface: Surface = 'paint') {
    const key = `${color}:${surface}:${glow}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new PBRMaterial(key, this.scene);
      m.albedoColor = Color3.FromHexString(color).toLinearSpace();
      m.metallic = surface === 'metal' ? .65 : 0;
      m.roughness = {paint: .48, wood: .5, fabric: .97, metal: .3, paper: .86, skin: .8, glass: .12}[surface];
      m.environmentIntensity = .65;
      if (glow) m.emissiveColor = Color3.FromHexString(color).scale(.65);
      if (['wood', 'fabric', 'paper'].includes(surface)) m.albedoTexture = this.texture(surface);
      if (surface === 'glass') { m.alpha = .16; m.backFaceCulling = false; }
      this.materials.set(key, m);
    }
    return m;
  }
  apply(mesh: Mesh, name: string, color: string) {
    const kind: Surface = /glass|pane/.test(name) ? 'glass'
      : /shirt|sleeve|trouser|sofa|cushion|chair back|chair$|floor|carpet/.test(name) ? 'fabric'
      : /desk$|table$|wood|shelf$/.test(name) ? 'wood'
      : /box$|carton|paper|notes|book/.test(name) ? 'paper'
      : /head|neck|hand|ear|nose/.test(name) ? 'skin'
      : /frame|leg|stem|pedestal|caster|wheel|handle|rail|mullion|column|metal|bracket|upright/.test(name) ? 'metal' : 'paint';
    mesh.material = this.mat(color, false, kind);
    if (!(mesh.material as PBRMaterial).albedoTexture) return;
    const p = mesh.getVerticesData(VertexBuffer.PositionKind)!;
    const n = mesh.getVerticesData(VertexBuffer.NormalKind)!;
    const uv: number[] = [];
    const scale = kind === 'wood' ? .8 : 2;
    for (let i = 0; i < p.length; i += 3) {
      const a = Math.abs(n[i]), b = Math.abs(n[i + 1]), c = Math.abs(n[i + 2]);
      uv.push((b >= a && b >= c ? p[i] : a > c ? p[i + 2] : p[i]) * scale,
        (b >= a && b >= c ? p[i + 2] : p[i + 1]) * scale);
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uv);
  }
  private texture(kind: Surface) {
    if (!this.scene.getEngine().getRenderingCanvas()) return null;
    if (this.textures.has(kind)) return this.textures.get(kind)!;
    const size = 256, pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
      const value = kind === 'wood' ? 232 + Math.sin(v * 24 + Math.sin(u) * 1.6) * 9 + Math.cos(v * 7 + u) * 5
        : kind === 'fabric' ? 246 + Math.sin(u * 64) * Math.sin(v * 64) * 5 : 247 + Math.sin(u * 17 + v * 31) * 2;
      const i = (y * size + x) * 4;
      pixels[i] = value; pixels[i + 1] = value; pixels[i + 2] = value; pixels[i + 3] = 255;
    }
    const texture = RawTexture.CreateRGBATexture(pixels, size, size, this.scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
    texture.name = `${kind} office surface`; texture.anisotropicFilteringLevel = 8;
    this.textures.set(kind, texture);
    return texture;
  }
}
