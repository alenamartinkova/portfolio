import { roundedSolid } from './RoundedGeometry';
import { OfficeMaterials } from './OfficeMaterials';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateTube } from '@babylonjs/core/Meshes/Builders/tubeBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { onLocaleChange } from '../i18n';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
export class Factory {
    private materials: OfficeMaterials;
    constructor(public scene: Scene) { this.materials = new OfficeMaterials(scene); }
    mat(color: string, glow = false) { return this.materials.mat(color, glow); }
    sphere(name: string, size: number[], pos: number[], color: string, parent?: TransformNode) {
        const mesh = CreateSphere(name, {diameter: 1, segments: 20}, this.scene);
        mesh.scaling.set(size[0], size[1], size[2]);
        mesh.position.set(pos[0], pos[1], pos[2]); mesh.parent = parent ?? null;
        mesh.isPickable = false; mesh.receiveShadows = true;
        this.materials.apply(mesh, name, color);
        return mesh;
    }
    tube(name: string, points: number[][], radius: number, color: string, parent?: TransformNode) {
        const mesh = CreateTube(name, {path: points.map(p => new Vector3(p[0], p[1], p[2])), radius, tessellation: 40, cap: 3}, this.scene);
        mesh.parent = parent ?? null; mesh.isPickable = false;
        this.materials.apply(mesh, name, color);
        return mesh;
    }
    box(name: string, size: number[], pos: number[], color: string, parent?: TransformNode) {
        const bevel = /floor|wall|glass|seam|grid|silhouette|skyline|rolling chair|rolling cart/.test(name) ? 0
            : Math.min(/sofa|chair back|cushion/.test(name) ? .12 : .045, Math.min(...size) * .23);
        const mesh = bevel > .002 ? roundedSolid(name, size, bevel, this.scene)
            : CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, this.scene);
        mesh.position.set(pos[0], pos[1], pos[2]);
        this.materials.apply(mesh, name, color);
        mesh.parent = parent ?? null;
        mesh.receiveShadows = true;
        mesh.isPickable = false;
        return mesh;
    }
    cylinder(name: string, diameter: number, height: number, pos: number[], color: string, parent?: TransformNode) {
        const mesh = CreateCylinder(name, { diameter, height, tessellation: 40 }, this.scene);
        mesh.position.set(pos[0], pos[1], pos[2]);
        this.materials.apply(mesh, name, color);
        mesh.parent = parent ?? null;
        mesh.isPickable = false;
        return mesh;
    }
    label(text: string | (() => string), width: number, height: number, pos: number[], color = '#f2edda', background = '#203d3d', floor = false) {
        const name = typeof text === 'function' ? text() : text;
        const tex = new DynamicTexture(name, { width: 1024, height: Math.round(1024 * height / width) }, this.scene, true);
        tex.anisotropicFilteringLevel = 16;
        const ctx = tex.getContext() as CanvasRenderingContext2D;
        const draw = () => {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, tex.getSize().width, tex.getSize().height);
        ctx.font = `bold ${tex.getSize().height * .55}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(typeof text === 'function' ? text() : text, 512, tex.getSize().height * .53, 980);
        tex.update();
        };
        draw();
        if (typeof text === 'function') {
          const unsubscribe = onLocaleChange(draw);
          this.scene.onDisposeObservable.addOnce(unsubscribe);
        }
        const mat = new StandardMaterial(name, this.scene);
        mat.diffuseTexture = tex;
        mat.emissiveColor = new Color3(.22, .22, .22);
        mat.specularColor = Color3.Black();
        mat.backFaceCulling = false;
        const mesh = CreatePlane(name, { width, height }, this.scene);
        mesh.material = mat;
        mesh.position.set(...pos as [
            number,
            number,
            number
        ]);
        mesh.isPickable = false;
        if (floor)
            mesh.rotation.x = Math.PI / 2;
        return mesh;
    }
}
