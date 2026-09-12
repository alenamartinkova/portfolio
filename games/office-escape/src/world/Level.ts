import { batchStaticDecorations } from '../../../../shared/static-batches.js';
import { renderBudget } from '../systems/RenderQuality';
import { t, areaNames } from '../i18n';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { Scene } from '@babylonjs/core/scene';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { buildArchitecture } from './Architecture';
import { Factory } from './Factory';
import { PhysicsInteractionSystem } from '../systems/PhysicsInteractionSystem';
import { officeLevels, type OfficeLevel, type Stop } from './levels';
import { SecuritySystem } from '../systems/SecuritySystem';
export { route, type Stop } from './levels';
export class Level {
    security: SecuritySystem;
    f: Factory;
    platforms: Mesh[] = [];
    checkpointMeshes: Mesh[] = [];
    exitDoor: Mesh;
    shadows?: ShadowGenerator;
    constructor(public scene: Scene, public physics: PhysicsInteractionSystem, public definition: OfficeLevel = officeLevels[0]) {
        this.f = new Factory(scene);
        const f = this.f;
        scene.clearColor = Color4.FromHexString(definition.sky);
        scene.ambientColor = new Color3(.12, .14, .16);
        scene.fogMode = Scene.FOGMODE_EXP2;
        scene.fogDensity = .004;
        scene.fogColor = Color3.FromHexString(definition.sky.slice(0, 7));
        const hemi = new HemisphericLight('after-hours fill', new Vector3(0, 1, 0), scene);
        hemi.intensity = .8;
        hemi.groundColor = Color3.FromHexString('#657478');
        const sun = new DirectionalLight('warm late sun', new Vector3(-.6, -1, .4), scene);
        sun.position.set(10, 25, -15);
        sun.intensity = 2.4;
        sun.diffuse = Color3.FromHexString('#ffdfba');
        if (renderBudget.shadows) {
            this.shadows = new ShadowGenerator(renderBudget.shadowSize, sun);
            this.shadows.usePercentageCloserFiltering = true;
            this.shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
            this.shadows.bias = .0003;
            this.shadows.normalBias = .025;
            this.shadows.setDarkness(.23);
        }
        if (['servers', 'rooftop', 'lockdown'].includes(definition.architecture)) {
            hemi.intensity = .65;
            sun.intensity = .9;
            sun.diffuse = Color3.FromHexString('#a5c9ff');
        }
        // Emissive route materials remain legible without a full-scene glow pass.
        if (definition.architecture === 'office') {
            const floor = f.box('forbidden office floor', [29, .4, 86], [0, -.2, 32], definition.floor);
            physics.rigid(floor);
            floor.metadata = { solid: true, forbidden: true };
            for (let z = -10; z < 75; z += 2)
                f.box('carpet seam', [29, .006, .008], [0, .005, z], '#667b78');
            for (let x = -14; x < 15; x += 2)
                f.box('carpet seam', [.008, .006, 86], [x, .005, 32], '#667b78');
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
                f.box('window lower rail', [.18, .08, 86], [x, 1.55, 32], '#87958e');
                for (let z = -6; z < 75; z += 6) {
                    f.box('window transom', [.1, .06, 6], [x, 5.9, z], '#52706c');
                    for (let y = 6.2; y < 7.4; y += .22)
                        f.box('sunshade slat', [.35, .045, 5.6], [x, y, z], '#c4c2b0');
                }

        }
        const back = f.box('end wall', [29, 8, .4], [0, 4, 75], '#304d4b');
        physics.rigid(back);
        f.box('wall skirting', [29, .14, .12], [0, .08, 74.72], '#8d9a90');
        for (let x = -13; x < 14; x += .6)
            f.box('oak wall slat', [.08, 5.6, .09], [x, 3.7, 74.73], '#a89675');
        for (const z of [2, 20, 38, 56, 70]) {
            for (const x of [-8.5, 8.5]) {
                f.tube('pendant suspension', [[x, 7.3, z], [x, 5.7, z]], .014, '#3b5153');
                f.box('pendant fixture', [4, .12, .32], [x, 5.68, z], '#354b4c');
                const diffuser = f.box('pendant diffuser', [3.85, .025, .24], [x, 5.61, z], '#fff1cd');
                diffuser.material = f.mat('#fff1cd', true);
            }
        }

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
        } else {
            buildArchitecture(f, physics, definition);
        }
        for (const stop of definition.route) {
            const m = this.furniture(stop);
            this.platforms.push(m);
            if (stop.checkpoint !== undefined) {
                const ring = CreateTorus('checkpoint ' + stop.checkpoint, { diameter: 1.5, thickness: .045, tessellation: 40 }, scene);
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
                dot.position.set(0, (['chair', 'cart', 'box'].includes(stop.kind) ? (stop.y - (stop.base ?? 0)) / 2 : stop.kind === 'sofa' ? .225 : ['ledge', 'beam'].includes(stop.kind) ? .15 : .09) + .025, 0);
            }
        }
        definition.route.forEach((stop, i) => {
            const next = definition.route[i + 1] ?? definition.exit;
            const platform = this.platforms[i];
            const arrow = f.box('route arrow', [.07, .015, .42], [0, stop.y - platform.position.y + .055, 0], '#21443b', platform);
            arrow.rotation.y = Math.atan2(next.x - stop.x, next.z - stop.z);
            for (const side of [-1, 1]) {
                const tip = f.box('route arrow tip', [.07, .015, .26], [side * .08, 0, .13], '#21443b', arrow);
                tip.rotation.y = -side * .7;
            }
        });
        if (definition.id === "first-evening") {
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
        }
        if (definition.architecture === 'office') {
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
        }
        const e = definition.exit;
        f.label(() => t('exitSign'), 4, .8, [e.x, e.y + 3.2, e.z + 1.7], '#f0ffe8', '#388f63');
        f.label(() => t('outSign'), 3.5, .45, [e.x, e.y + 2.5, e.z + 1.7]);
        this.exitDoor = f.box('emergency door', [3, 3, .2], [e.x, e.y + 1.5, e.z + 1.8], '#679878');
        f.box('push bar', [2, .12, .16], [0, -.1, -.2], '#dce5ce', this.exitDoor);
        const landing = f.box('exit landing', [5, .3, 4], [e.x, e.y - .15, e.z], '#c6bc9f');
        physics.rigid(landing);
        // Combine only static, decorative meshes. Physics surfaces, movable furniture,
        // checkpoint rings and the sliding exit keep their own transforms.
        batchStaticDecorations(scene, Mesh, new Set([this.exitDoor, ...this.checkpointMeshes]));
        this.security = new SecuritySystem(this.f, definition);
        if (this.shadows) for (const m of scene.meshes)
            if (m instanceof Mesh && m.getTotalVertices() > 0 && !m.name.includes('glass') && !m.name.includes('city') && !m.metadata?.forbidden && !m.metadata?.noShadow && (m.material?.alpha ?? 1) === 1)
                this.shadows.addShadowCaster(m);
    }
    furniture(s: Stop, decor = false) {
        const f = this.f;
        const baseY = s.base ?? 0;
        const height = s.y - baseY;
        if (s.kind === 'ledge' || s.kind === 'beam') {
            const top = f.box(s.kind, [s.w, .3, s.d], [s.x, s.y - .15, s.z], s.kind === 'beam' ? '#d5ac65' : '#739ba2');
            this.physics.rigid(top);
            for (const x of [-1, 1]) {
                f.box('platform edge', [.06, .025, s.d], [x * (s.w / 2 - .04), .16, 0], '#e9cb88', top);
                f.box('platform bracket', [.1, .65, s.d * .65], [x * s.w * .35, -.4, 0], '#3c5665', top);
            }
            return top;
        }
        if (baseY > 0) {
            const support = f.box('furniture storey support', [s.w + .12, .2, s.d + .12], [s.x, baseY - .1, s.z], '#4d6973');
            this.physics.rigid(support);
        }
        const moving = ['chair', 'cart', 'box'].includes(s.kind);
        const color = moving ? '#d9975e' : s.kind === 'sofa' ? '#669489' : s.kind === 'counter' ? '#e3dfc7' : '#d7bd91';
        const thickness = s.kind === 'box' ? height : s.kind === 'sofa' ? .45 : .18;
        const top = f.box(s.kind, [s.w, thickness, s.d], [s.x, s.y - thickness / 2, s.z], color);
        if (s.kind === 'chair' || s.kind === 'cart') {
            // Invisible full-height hull gives stable low center of mass; the seat remains the landing face.
            const hull = f.box('rolling ' + s.kind, [s.w, height, s.d], [s.x, baseY + height / 2, s.z], color);
            hull.visibility = 0;
            top.parent = hull;
            top.position.set(0, height / 2 - thickness / 2, 0);
            this.physics.rigid(hull, s.kind === 'chair' ? 12 : 28, s.kind === 'chair' ? 'office chair' : 'rolling cart');
            if (s.kind === 'chair') {
                f.cylinder('gas lift pedestal', .12, height - .3, [0, -.05, 0], '#a5b0ac', hull);
                f.cylinder('pedestal sleeve', .2, height * .42, [0, -height * .2, 0], '#3a4548', hull);
                for (let i = 0; i < 5; i++) {
                    const a = i * Math.PI * 2 / 5, x = Math.sin(a) * s.w * .38, z = Math.cos(a) * s.d * .38;
                    f.tube('chair wheel spoke', [[0, -height / 2 + .25, 0], [x * .7, -height / 2 + .2, z * .7], [x, -height / 2 + .18, z]], .045, '#89948f', hull);
                    const wheel = f.cylinder('rubber caster', .19, .14, [x, -height / 2 + .11, z], '#2d3437', hull);
                    wheel.rotation.z = Math.PI / 2;
                }
                f.tube('chair back support', [[0, height / 2 - .2, s.d * .3], [0, height / 2 + .3, s.d * .45], [0, height / 2 + .55, s.d * .45]], .055, '#4d5756', hull);
                const back = f.box('chair back cushion', [s.w * .92, .72, .22], [0, height / 2 + .38, s.d * .44], '#b97a50', hull);
                back.rotation.x = -.12;
                for (const side of [-1, 1]) {
                    f.tube('armrest frame', [[side * s.w * .39, height / 2 - .1, 0], [side * s.w * .44, height / 2 + .22, .08]], .038, '#53605d', hull);
                    f.box('armrest pad', [.12, .07, s.d * .45], [side * s.w * .44, height / 2 + .25, .03], '#3a4243', hull);
                }
            } else {
                for (const x of [-s.w * .4, s.w * .4]) for (const z of [-s.d * .4, s.d * .4]) {
                    f.cylinder('cart upright', .06, height - .2, [x, 0, z], '#718983', hull);
                    const wheel = f.cylinder('rubber caster', .22, .15, [x, -height / 2 + .13, z], '#293c40', hull);
                    wheel.rotation.z = Math.PI / 2;
                }
                f.box('bottom cart shelf', [s.w, .1, s.d], [0, -height / 2 + .35, 0], '#709087', hull);
                for (const side of [-1, 1]) f.tube('cart handle', [[side * s.w * .44, height / 2, -.35], [side * s.w * .44, height / 2 + .2, -.35], [side * s.w * .44, height / 2 + .2, .35], [side * s.w * .44, height / 2, .35]], .035, '#9caaa1', hull);
            }
            return hull;
        }
        this.physics.rigid(top, s.kind === 'box' ? 18 : 0, s.kind === 'box' ? 'archive box' : s.kind);
        if (s.kind === 'box') {
            f.box('packing tape', [.23, .01, s.d], [0, height / 2 + .006, 0], '#eee0b5', top);
            f.box('archive label', [.7, .35, .01], [0, 0, -s.d / 2 - .01], '#f5e6c5', top);
        }
        else if (['cabinet', 'counter', 'shelf'].includes(s.kind)) {
            const base = f.box('cabinet base', [s.w - .12, height - .18, s.d - .12], [s.x, baseY + (height - .18) / 2, s.z], s.kind === 'counter' ? '#73948a' : '#64847a');
            this.physics.rigid(base);
            for (let y = baseY + .4; y < s.y; y += .55) {
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
                    f.box('furniture leg', [.12, height - .18, .12], [s.x + x, baseY + (height - .18) / 2, s.z + z], '#335754');
            if (s.kind === 'sofa') {
                f.box('sofa back cushion', [s.w, .6, .3], [s.x, s.y + .2, s.z + s.d / 2 - .15], '#507a70');
                for (const side of [-1, 1]) {
                    f.box('sofa arm cushion', [.22, .45, s.d], [s.x + side * (s.w / 2 - .11), s.y + .06, s.z], '#5b877c');
                    f.box('sofa cushion piping', [.012, .014, s.d * .82], [s.x + side * s.w / 6, s.y + .006, s.z], '#4f796f');
                }
            }
            if (s.kind === 'desk') {
                f.box('monitor foot', [.42, .035, .28], [s.x - .7, s.y + .022, s.z + s.d * .31], '#5b6c6c');
                f.box('monitor stem', [.08, .35, .08], [s.x - .7, s.y + .2, s.z + s.d * .31], '#31494a');
                f.box('monitor', [.95, .6, .09], [s.x - .7, s.y + .65, s.z + s.d * .31], '#2d4245');
                f.box('screen', [.84, .46, .012], [s.x - .7, s.y + .65, s.z + s.d * .31 - .052], '#759d9d');
                f.box('keyboard', [.65, .035, .23], [s.x - .7, s.y + .025, s.z + .15], '#52706b');
                for (let row = 0; row < 4; row++) for (let key = 0; key < 10; key++)
                    f.box('keyboard key', [.044, .008, .035], [s.x - .97 + key * .059, s.y + .047, s.z + .073 + row * .049], '#a6b3ac');
                f.sphere('wireless mouse', [.13, .055, .2], [s.x - .12, s.y + .03, s.z + .12], '#bbc4b9');
                f.box('screen taskbar', [.8, .036, .007], [s.x - .7, s.y + .44, s.z + s.d * .31 - .061], '#335c64');
                f.box('screen window', [.47, .31, .008], [s.x - .77, s.y + .69, s.z + s.d * .31 - .062], '#d6dfd2');
                for (let line = 0; line < 4; line++)
                    f.box('screen text', [.19 + (line % 2) * .13, .009, .009], [s.x - .8, s.y + .77 - line * .055, s.z + s.d * .31 - .069], '#879e9c');
                f.box('desk drawer', [.65, .2, s.d * .55], [s.x + s.w * .28, s.y - .23, s.z], '#b8a47f');
                f.box('drawer metal pull', [.23, .035, .04], [s.x + s.w * .28, s.y - .23, s.z - s.d * .28], '#81968e');

                f.cylinder('coffee cup', .2, .23, [s.x + .9, s.y + .12, s.z + .5], '#f1ddaa');
                f.cylinder('coffee surface', .16, .005, [s.x + .9, s.y + .234, s.z + .5], '#49362a');
                f.tube('cup handle', [[s.x + .99, s.y + .19, s.z + .5], [s.x + 1.08, s.y + .18, s.z + .5], [s.x + 1.08, s.y + .08, s.z + .5], [s.x + .99, s.y + .07, s.z + .5]], .022, '#f1ddaa');

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
        const pot = f.cylinder('ceramic plant pot', .72, .65, [x, .325, z], '#b89b7d');
        this.physics.rigid(pot, 8, 'potted plant');
        f.cylinder('planter rim', .76, .065, [0, .29, 0], '#c8b395', pot);
        f.cylinder('potting soil', .64, .02, [0, .326, 0], '#514637', pot);
        for (let i = 0; i < 9; i++) {
            const a = i * 2.4, h = .7 + (i % 3) * .27;
            const x = Math.sin(a) * .3, z = Math.cos(a) * .3;
            f.tube('plant stem', [[0, .32, 0], [x * .35, h * .7, z * .35], [x, h, z]], .017, '#476747', pot);
            const leaf = f.sphere('broad leaf', [.32, .66, .047], [x, h + .13, z], i % 2 ? '#497256' : '#6c9065', pot);
            leaf.rotation.set(.35, a, Math.sin(a) * .55);
        }
    }
}
