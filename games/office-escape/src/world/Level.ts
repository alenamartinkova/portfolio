import { t, areaNames } from '../i18n';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Factory } from './Factory';
import { PhysicsInteractionSystem } from '../systems/PhysicsInteractionSystem';
export interface Stop {
    x: number;
    z: number;
    y: number;
    w: number;
    d: number;
    kind: 'desk' | 'cabinet' | 'chair' | 'table' | 'counter' | 'cart' | 'box' | 'sofa' | 'shelf';
    checkpoint?: number;
}
export const route: Stop[] = [
    { x: 0, z: 0, y: 1.4, w: 3.6, d: 2.5, kind: 'desk', checkpoint: 0 },
    { x: 2, z: 3.4, y: 1.2, w: 1.5, d: 1.5, kind: 'chair' },
    { x: 4, z: 6.5, y: 1.4, w: 3, d: 2, kind: 'desk' },
    { x: .5, z: 9.7, y: 1.8, w: 2.6, d: 1.8, kind: 'cabinet' },
    { x: -3, z: 12.6, y: 1.4, w: 3, d: 2.2, kind: 'desk' },
    { x: -5, z: 16.5, y: 1.4, w: 3.4, d: 2.8, kind: 'cabinet', checkpoint: 1 },
    { x: -1, z: 19.7, y: 1.4, w: 4.3, d: 2.2, kind: 'table' },
    { x: 3.5, z: 23.3, y: 1.35, w: 1.8, d: 2, kind: 'cart' },
    { x: 6, z: 27, y: 1.5, w: 3.7, d: 2.4, kind: 'table' },
    { x: 1.8, z: 30.8, y: 1.3, w: 3.2, d: 2, kind: 'sofa' },
    { x: -2.5, z: 34, y: 1.5, w: 3.4, d: 3, kind: 'counter', checkpoint: 2 },
    { x: -6.5, z: 37.5, y: 1.5, w: 3.2, d: 2, kind: 'counter' },
    { x: -3, z: 41, y: 1.35, w: 1.8, d: 2, kind: 'cart' },
    { x: 1, z: 44, y: 1.5, w: 3.1, d: 2.3, kind: 'table' },
    { x: 5, z: 47.5, y: 1.8, w: 1.7, d: 1.7, kind: 'box' },
    { x: 7, z: 51.5, y: 1.8, w: 3.5, d: 3, kind: 'cabinet', checkpoint: 3 },
    { x: 3, z: 55, y: 2.2, w: 2.5, d: 2, kind: 'shelf' },
    { x: -1, z: 58.8, y: 2.6, w: 2.4, d: 1.8, kind: 'shelf' },
    { x: -4.5, z: 62.4, y: 3, w: 3, d: 2, kind: 'cabinet' },
    { x: -1, z: 66.5, y: 3, w: 2.6, d: 2.4, kind: 'table' },
    { x: 3, z: 70, y: 3, w: 4, d: 3, kind: 'counter' },
];
export class Level {
    f: Factory;
    platforms: Mesh[] = [];
    checkpointMeshes: Mesh[] = [];
    exitDoor: Mesh;
    shadows: ShadowGenerator;
    constructor(public scene: Scene, public physics: PhysicsInteractionSystem) {
        this.f = new Factory(scene);
        const f = this.f;
        scene.clearColor = Color4.FromHexString('#9eb9baff');
        scene.ambientColor = new Color3(.45, .5, .5);
        const hemi = new HemisphericLight('after-hours fill', new Vector3(0, 1, 0), scene);
        hemi.intensity = .85;
        hemi.groundColor = Color3.FromHexString('#657478');
        const sun = new DirectionalLight('warm late sun', new Vector3(-.6, -1, .4), scene);
        sun.position.set(10, 25, -15);
        sun.intensity = 1.8;
        sun.diffuse = Color3.FromHexString('#ffdfba');
        this.shadows = new ShadowGenerator(2048, sun);
        this.shadows.useBlurExponentialShadowMap = true;
        this.shadows.blurKernel = 16;
        this.shadows.setDarkness(.23);
        const glow = new GlowLayer('exit and route glow', scene);
        glow.intensity = .3;
        const floor = f.box('forbidden office floor', [29, .4, 86], [0, -.2, 32], '#506868');
        physics.rigid(floor);
        floor.metadata = { solid: true, forbidden: true };
        for (let z = -10; z < 75; z += 2)
            f.box('carpet seam', [29, .012, .025], [0, .005, z], '#607574');
        for (let x = -14; x < 15; x += 2)
            f.box('carpet seam', [.025, .012, 86], [x, .005, 32], '#607574');
        for (const x of [-14.5, 14.5]) {
            const wall = f.box('window sill', [.35, 1.5, 86], [x, .75, 32], '#334d50');
            physics.rigid(wall);
            for (let z = -9; z < 76; z += 6) {
                f.box('window mullion', [.18, 7, .16], [x, 4, z], '#253f43');
                const pane = f.box('blue evening glass', [.05, 5.2, 5.8], [x, 4.3, z + 3], '#b7d7d6');
                const glass = f.mat('#b7d7d6');
                glass.alpha = .13;
                pane.material = glass;
            }
            f.box('window header', [.3, .3, 86], [x, 7.5, 32], '#334d50');
        }
        const back = f.box('end wall', [29, 8, .4], [0, 4, 75], '#304d4b');
        physics.rigid(back);
        for (let i = 0; i < 24; i++) {
            const x = (i % 2 ? -1 : 1) * (19 + (i % 4) * 3);
            const z = -8 + Math.floor(i / 2) * 8;
            const h = 3 + (i * 7 % 11);
            f.box('city silhouette', [4, h, 5], [x, h / 2 - 3, z], '#789797');
            for (let y = 0; y < h; y += 1.8)
                f.box('distant lit windows', [4.03, .35, 3], [x, y - 2, z], '#b5c5b8');
        }
        [15, 33, 51].forEach((z, i) => {
            f.label(() => `0${i + 2}   ${t(areaNames[i + 1]).toUpperCase()}`, 6, .6, [0, 5, z], '#f0ead6', '#274440');
            for (const x of [-11, 11]) {
                const partition = f.box('glass meeting partition', [5, 4.8, .12], [x, 2.4, z], '#acdbd6');
                partition.material = f.mat('#acdbd6');
                f.mat('#acdbd6').alpha = .23;
                physics.rigid(partition);
                f.box('partition frame', [5, .08, .18], [x, 4.8, z], '#345753');
                f.box('partition stripe', [5, .08, .15], [x, 1.6, z], '#edf3df');
            }
        });
        for (const stop of route) {
            const m = this.furniture(stop);
            this.platforms.push(m);
            if (stop.checkpoint !== undefined) {
                const ring = MeshBuilder.CreateTorus('checkpoint ' + stop.checkpoint, { diameter: 1.5, thickness: .045, tessellation: 40 }, scene);
                ring.position.set(stop.x, stop.y + .035, stop.z);
                ring.material = f.mat('#b8f4bc', true);
                ring.isPickable = false;
                this.checkpointMeshes.push(ring);
                f.label(() => stop.checkpoint === 0 ? t('startSign') : `${t('checkpointSign')} 0${stop.checkpoint}`, 1.6, .25, [stop.x, stop.y + .025, stop.z + .8], '#21443b', '#b8f4bc', true);
            }
            else {
                const dot = f.cylinder('route marker', .22, .015, [stop.x, stop.y + .023, stop.z], '#c8f6c0');
                dot.material = f.mat('#c8f6c0', true);
                dot.parent = m;
                dot.position.set(0, (['chair', 'cart', 'box'].includes(stop.kind) ? stop.y / 2 : stop.kind === 'sofa' ? .225 : .09) + .025, 0);
            }
        }
        // Optional precision line: small copier and rotating chair bypass the wide desk loop.
        this.furniture({ x: -.8, z: 5.4, y: 1.6, w: 1.45, d: 1.4, kind: 'box' });
        this.furniture({ x: -4, z: 8.9, y: 1.3, w: 1.35, d: 1.4, kind: 'chair' });
        // Advanced line: narrow movable whiteboard bridge, angled between meeting tables.
        this.furniture({ x: -1.9, z: 22.1, y: 1.1, w: 1.5, d: 1.4, kind: 'cabinet' });
        this.furniture({ x: -3.8, z: 27.9, y: 1.1, w: 1.5, d: 1.4, kind: 'cabinet' });
        const board = f.box('rolling whiteboard bridge', [1.05, .18, 6.8], [-2.9, 1.24, 25], '#dbe7cf');
        board.rotation.y = -.32;
        physics.rigid(board, 9, 'whiteboard bridge');
        f.box('whiteboard orange rail', [.1, .1, 6.8], [.5, .1, 0], '#e8a266', board);
        f.label(() => t('emailSign'), 3.2, .4, [-6, 3.2, 28]);
        // Deliberately dressed perimeter; these desks and counters also support alternate lines.
        for (const z of [0, 6, 21, 27, 39, 45, 59, 65])
            for (const x of [-10.5, 10.5]) {
                this.furniture({ x, z, y: 1.4, w: 3, d: 1.7, kind: z > 33 ? 'cabinet' : 'desk' }, true);
                this.plant(x + (x < 0 ? 2 : -2), z - 1.5);
            }
        this.plant(-3, -3);
        this.plant(6, 2);
        this.plant(-7, 32);
        this.plant(9, 70);
        f.label(() => t('climbSign'), 5, .65, [0, 3.8, -4], '#283f3a', '#e9d8a8');
        f.label(() => t('synergySign'), 6, .65, [-6, 4.3, 74]);
        f.label(() => t('meetingSign'), 4, .5, [9, 3.3, 25]);
        f.label(() => t('coffeeSign'), 4, .5, [-8, 3.3, 43]);
        f.label(() => t('exitSign'), 4, 1, [3, 5.8, 74.65], '#f0ffe8', '#388f63');
        f.label(() => t('outSign'), 3.5, .5, [3, 4.8, 74.65]);
        this.exitDoor = f.box('emergency door', [3, 4, .2], [3, 3, 74.5], '#679878');
        f.box('push bar', [2, .12, .16], [0, -.1, -.2], '#dce5ce', this.exitDoor);
        const landing = f.box('exit landing', [5, 3, 4], [3, 1.5, 73], '#c6bc9f');
        physics.rigid(landing);
        for (const m of scene.meshes)
            if (m instanceof Mesh && m.getTotalVertices() > 0 && !m.name.includes('glass') && !m.name.includes('city'))
                this.shadows.addShadowCaster(m);
    }
    furniture(s: Stop, decor = false) {
        const f = this.f;
        const moving = ['chair', 'cart', 'box'].includes(s.kind);
        const color = moving ? '#d9975e' : s.kind === 'sofa' ? '#669489' : s.kind === 'counter' ? '#e3dfc7' : '#d7bd91';
        const thickness = s.kind === 'box' ? s.y : s.kind === 'sofa' ? .45 : .18;
        const top = f.box(s.kind, [s.w, thickness, s.d], [s.x, s.y - thickness / 2, s.z], color);
        if (s.kind === 'chair' || s.kind === 'cart') {
            // Invisible full-height hull gives stable low center of mass; the seat remains the landing face.
            const hull = f.box('rolling ' + s.kind, [s.w, s.y, s.d], [s.x, s.y / 2, s.z], color);
            hull.visibility = 0;
            top.parent = hull;
            top.position.set(0, s.y / 2 - thickness / 2, 0);
            this.physics.rigid(hull, s.kind === 'chair' ? 12 : 28, s.kind === 'chair' ? 'office chair' : 'rolling cart');
            f.cylinder('pedestal', .12, s.y - .3, [0, -.1, 0], '#394d4d', hull);
            for (const x of [-s.w * .35, s.w * .35])
                for (const z of [-s.d * .35, s.d * .35]) {
                    f.cylinder('caster', .2, .18, [x, -s.y / 2 + .13, z], '#293c40', hull);
                    if (s.kind === 'cart')
                        f.box('cart upright', [.06, s.y - .2, .06], [x, 0, z], '#344d50', hull);
                }
            f.box('wheel base', [s.w * .8, .07, s.d * .8], [0, -s.y / 2 + .23, 0], '#455d5c', hull);
            if (s.kind === 'chair')
                f.box('chair back', [s.w, .8, .15], [0, s.y / 2 + .25, s.d / 2 - .05], '#cb814b', hull);
            if (s.kind === 'cart')
                f.box('bottom cart shelf', [s.w, .1, s.d], [0, -s.y / 2 + .35, 0], '#709087', hull);
            return hull;
        }
        this.physics.rigid(top, s.kind === 'box' ? 18 : 0, s.kind === 'box' ? 'archive box' : s.kind);
        if (s.kind === 'box') {
            f.box('packing tape', [.23, .01, s.d], [0, s.y / 2 + .006, 0], '#eee0b5', top);
            f.box('archive label', [.7, .35, .01], [0, 0, -s.d / 2 - .01], '#f5e6c5', top);
        }
        else if (['cabinet', 'counter', 'shelf'].includes(s.kind)) {
            const base = f.box('cabinet base', [s.w - .12, s.y - .18, s.d - .12], [s.x, (s.y - .18) / 2, s.z], s.kind === 'counter' ? '#73948a' : '#64847a');
            this.physics.rigid(base);
            for (let y = .4; y < s.y; y += .55) {
                f.box('drawer seam', [s.w - .2, .025, .02], [s.x, y, s.z - s.d / 2], '#3c665c');
                f.box('brass handle', [.45, .05, .08], [s.x, y + .18, s.z - s.d / 2], '#d0bea0');
            }
            if (s.kind === 'counter' && decor) {
                f.box('coffee machine', [.6, .7, .5], [s.x, s.y + .35, s.z], '#334748');
                f.cylinder('coffee mug', .18, .2, [s.x + .6, s.y + .1, s.z], '#d9a066');
            }
        }
        else {
            for (const x of [-s.w * .4, s.w * .4])
                for (const z of [-s.d * .36, s.d * .36])
                    f.box('furniture leg', [.12, s.y - .18, .12], [s.x + x, (s.y - .18) / 2, s.z + z], '#335754');
            if (s.kind === 'sofa')
                f.box('sofa back', [s.w, .5, .3], [s.x, s.y + .15, s.z + s.d / 2 - .15], '#507a70');
            if (s.kind === 'desk') {
                f.box('monitor stem', [.08, .35, .08], [s.x - .7, s.y + .2, s.z + s.d * .31], '#31494a');
                f.box('monitor', [.95, .6, .09], [s.x - .7, s.y + .65, s.z + s.d * .31], '#2d4245');
                f.box('screen', [.84, .46, .012], [s.x - .7, s.y + .65, s.z + s.d * .31 - .052], '#759d9d');
                f.box('keyboard', [.65, .035, .23], [s.x - .7, s.y + .025, s.z + .15], '#52706b');
                f.cylinder('coffee cup', .2, .23, [s.x + .9, s.y + .12, s.z + .5], '#f1ddaa');
            }
            if (s.kind === 'table') {
                f.box('abandoned pizza box', [.7, .07, .65], [s.x + s.w * .3, s.y + .04, s.z + .5], '#c9895c');
                f.box('meeting notes', [.4, .012, .3], [s.x - .7, s.y + .01, s.z], '#eee8d6');
            }
        }
        return top;
    }
    plant(x: number, z: number) {
        const f = this.f;
        const pot = f.box('plant pot', [.7, .65, .7], [x, .325, z], '#c29c76');
        this.physics.rigid(pot, 8, 'potted plant');
        f.cylinder('stem', .07, 1.25, [0, .9, 0], '#477360', pot);
        for (let i = 0; i < 5; i++) {
            const leaf = MeshBuilder.CreateSphere('leaf', { diameter: .7, segments: 5 }, this.scene);
            leaf.scaling.set(.65, 1.5, .4);
            leaf.parent = pot;
            leaf.position.set(Math.sin(i * 2) * .35, 1 + Math.cos(i) * .3, Math.cos(i * 2) * .3);
            leaf.rotation.z = Math.sin(i) * .6;
            leaf.material = f.mat(i % 2 ? '#59846a' : '#84a77d');
            leaf.isPickable = false;
        }
    }
}
