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
    private materials = new Map<string, StandardMaterial>();
    constructor(public scene: Scene) { }
    mat(color: string, glow = false) {
        const key = color + glow;
        if (!this.materials.has(key)) {
            const m = new StandardMaterial(key, this.scene);
            m.diffuseColor = Color3.FromHexString(color);
            m.specularColor = new Color3(.12, .12, .12);
            if (glow)
                m.emissiveColor = m.diffuseColor.scale(.8);
            this.materials.set(key, m);
        }
        return this.materials.get(key)!;
    }
    box(name: string, size: number[], pos: number[], color: string, parent?: TransformNode) {
        const mesh = CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, this.scene);
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.material = this.mat(color);
        mesh.parent = parent ?? null;
        mesh.receiveShadows = true;
        mesh.isPickable = false;
        return mesh;
    }
    cylinder(name: string, diameter: number, height: number, pos: number[], color: string, parent?: TransformNode) {
        const mesh = CreateCylinder(name, { diameter, height, tessellation: 12 }, this.scene);
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.material = this.mat(color);
        mesh.parent = parent ?? null;
        mesh.isPickable = false;
        return mesh;
    }
    label(text: string | (() => string), width: number, height: number, pos: number[], color = '#f2edda', background = '#203d3d', floor = false) {
        const name = typeof text === 'function' ? text() : text;
        const tex = new DynamicTexture(name, { width: 1024, height: Math.round(1024 * height / width) }, this.scene, false);
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
        mat.emissiveColor = new Color3(.35, .35, .35);
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
