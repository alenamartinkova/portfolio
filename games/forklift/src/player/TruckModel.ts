import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateLathe } from '@babylonjs/core/Meshes/Builders/latheBuilder';
import { CreateTube } from '@babylonjs/core/Meshes/Builders/tubeBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import { SphericalPolynomial } from '@babylonjs/core/Maths/sphericalPolynomial';
import type { Factory } from '../world/Factory';
import { normalizeStyle, type TruckStyle } from './Customization';
import { forgedFork, roundedSolid } from './TruckGeometry';

type Point = readonly [number, number, number];

/** Visual-only assembly. Authored collision shapes remain in ForkliftController. */
export class TruckModel {
  readonly wheels: Mesh[] = [];
  readonly mast: TransformNode;
  private rearAxles: TransformNode[] = [];
  private pistons: Mesh[] = [];
  private innerMast: TransformNode;
  private steering: TransformNode;
  private utility: TransformNode;
  private stripes: TransformNode;
  private paint: PBRMaterial;
  private rims: PBRMaterial;
  private lenses: PBRMaterial;
  private frame: PBRMaterial;
  private upholstery: PBRMaterial;
  private canopy: TransformNode;
  private materials: PBRMaterial[] = [];

  constructor(f: Factory, root: TransformNode, forkRoot: TransformNode) {
    const scene = f.scene;
    // Small local reflection map: broad warehouse windows and ceiling strips.
    // No downloaded HDR, render-target passes, or per-frame reflection captures.
    const size = 32;
    const faces = Array.from({ length: 6 }, (_, face) => {
      const pixels = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const ceiling = face === 2, floor = face === 3;
        const strip = ceiling && (Math.abs(x - 8) < 2 || Math.abs(x - 24) < 2);
        const window = !ceiling && !floor && y > 5 && y < 14 && x > 5 && x < 26;
        const level = strip ? 235 : window ? 170 : floor ? 38 : ceiling ? 85 : 65 - y * .8;
        const i = (y * size + x) * 4;
        pixels[i] = level; pixels[i + 1] = level * 1.02; pixels[i + 2] = level * 1.06; pixels[i + 3] = 255;
      }
      return pixels;
    });
    const reflection = scene.getEngine().getRenderingCanvas()
      ? new RawCubeTexture(scene, faces, size, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_UNSIGNED_BYTE, true) : null;
    if (reflection) {
      reflection.name = 'truck warehouse reflections';
      reflection.gammaSpace = true;
      // Explicit low ambient irradiance avoids GPU readback and also supports NullEngine.
      const irradiance = new SphericalPolynomial();
      irradiance.xx.set(.12, .13, .14); irradiance.yy.set(.12, .13, .14); irradiance.zz.set(.12, .13, .14);
      reflection.sphericalPolynomial = irradiance;
      scene.environmentTexture = reflection;
    }
    const mat = (name: string, color: string, metallic: number, roughness: number) => {
      const m = new PBRMaterial(name, scene);
      m.albedoColor = Color3.FromHexString(color).toLinearSpace(); m.metallic = metallic; m.roughness = roughness;
      m.reflectionTexture = reflection; m.environmentIntensity = .55;
      m.maxSimultaneousLights = 4;
      this.materials.push(m);
      return m;
    };
    this.paint = mat('enamel paint', '#efbd42', .22, .3);
    this.paint.clearCoat.isEnabled = true; this.paint.clearCoat.intensity = .55; this.paint.clearCoat.roughness = .24;
    this.rims = mat('cast wheel alloy', '#829396', .72, .3);
    const steel = mat('powder coated graphite', '#30363b', .55, .42);
    this.frame = mat('cab frame finish', '#30363b', .55, .4);
    const dark = mat('recessed metal', '#11181d', .35, .52);
    const rubber = mat('solid industrial rubber', '#202325', .02, .92);
    const tread = mat('rubber tread shoulders', '#292c2e', .02, .87);
    const seat = mat('textured charcoal vinyl', '#303336', .02, .78);
    this.upholstery = seat;
    const chrome = mat('polished hydraulic steel', '#c3cbd0', .88, .19);
    const forkSteel = mat('forged fork steel', '#68747b', .78, .38);
    const red = mat('rear signal lens', '#a42214', .1, .3);
    red.emissiveColor = Color3.FromHexString('#4a0802');
    const amber = mat('amber polycarbonate', '#f69415', .05, .24);
    amber.emissiveColor = Color3.FromHexString('#aa4406');
    this.lenses = mat('work lamp lenses', '#fff3d9', .05, .18);
    const node = (name: string, parent = root) => { const n = new TransformNode(name, scene); n.parent = parent; return n; };
    this.utility = node('utility equipment'); this.stripes = node('safety markings'); this.canopy = node('weather canopy');
    const place = (m: Mesh, p: Point, material: Material, parent = root) => {
      m.position.set(...p); m.material = material; m.parent = parent; m.receiveShadows = true; m.isPickable = false;
      return m;
    };
    const box = (name: string, size: Point, p: Point, material: Material, radius = .025, parent = root) => place(roundedSolid(name, size, radius, scene), p, material, parent);
    const cylinder = (name: string, diameter: number, height: number, p: Point, material: Material, parent = root, segments = 40) => place(CreateCylinder(name, { diameter, height, tessellation: segments }, scene), p, material, parent);
    const tube = (name: string, points: Point[], radius: number, material: Material, parent = root) => place(CreateTube(name, { path: points.map(p => new Vector3(...p)), radius, tessellation: 10, cap: Mesh.CAP_ALL }, scene), [0, 0, 0], material, parent);
    const torus = (name: string, diameter: number, thickness: number, p: Point, material: Material, parent = root) => place(CreateTorus(name, { diameter, thickness, tessellation: 40 }, scene), p, material, parent);

    box('cast lower chassis', [1.65, .33, 2.65], [0, -.22, -.03], steel, .14);
    box('rounded counterweight', [1.79, .88, 1.22], [0, .1, -.76], this.paint, .29);
    box('engine cover seam', [1.52, .055, 1.04], [0, .523, -.71], dark, .025);
    const hood = box('sloped engine hood', [1.53, .17, 1.04], [0, .6, -.71], this.paint, .08);
    hood.rotation.x = -.075;
    box('wraparound bumper', [1.83, .2, .43], [0, -.24, -1.19], dark, .095);
    box('rear recessed grille', [.96, .32, .06], [0, .18, -1.379], dark, .09);
    for (let i = 0; i < 7; i++) box('horizontal cooling louvre', [.78, .016, .027], [0, .065 + i * .038, -1.416], steel, .007);
    for (const side of [-1, 1]) {
      box('side sill', [.16, .28, 1.37], [side * .77, -.02, .2], this.paint, .075);
      box('front wheel fender', [.36, .11, .91], [side * .77, .2, .79], this.paint, .05);
      box('fender return', [.18, .34, .14], [side * .79, .06, .34], this.paint, .05);
      box('rear lamp gasket', [.28, .16, .065], [side * .6, .23, -1.336], dark, .05);
      box('rear red lamp', [.17, .1, .045], [side * .57, .24, -1.374], red, .03);
      box('rear amber indicator', [.065, .1, .045], [side * .68, .24, -1.358], amber, .023);
      for (let i = 0; i < 4; i++) {
        const stripe = box('diagonal reflective tape', [.075, .15, .014], [side * (.28 + i * .115), -.04, -1.354 + i * .012], dark, .004, this.stripes);
        stripe.rotation.z = -.5;
      }
      box('recessed step', [.25, .08, .6], [side * .91, -.22, -.03], steel, .03);
      for (let j = 0; j < 7; j++) box('anti slip step ribs', [.2, .015, .024], [side * .92, -.17, -.27 + j * .078], chrome, .006);
      tube('grab handle', [[side * .76, .39, .46], [side * .8, .57, .5], [side * .8, 1.05, .57], [side * .76, 1.2, .62]], .023, steel);
      // Side inspection cover, panel fasteners and inset cooling slots.
      box('side service panel', [.026, .35, .57], [side * .885, .12, -.65], this.paint, .012);
      for (let j = 0; j < 5; j++) box('side cooling slot', [.012, .018, .23], [side * .902, .04 + j * .044, -.65], dark, .004);
    }
    // Tires are revolved curved cross sections with a recessed bead and two tread channels.
    const tireProfile = [[.205, -.15], [.28, -.174], [.33, -.168], [.365, -.135], [.385, -.1], [.39, -.066], [.379, -.052], [.391, -.038], [.393, .038], [.379, .052], [.39, .066], [.385, .1], [.365, .135], [.33, .168], [.28, .174], [.205, .15], [.205, -.15]];
    for (const x of [-.88, .88]) for (const z of [-.87, .8]) {
      const pivot = node('wheel steering knuckle'); pivot.position.set(x, -.25, z);
      if (z < 0) this.rearAxles.push(pivot);
      const wheel = new Mesh('wheel rolling assembly', scene); wheel.parent = pivot;
      this.wheels.push(wheel);
      const tire = place(CreateLathe('rounded solid tire', { shape: tireProfile.map(([r, y]) => new Vector3(r, y, 0)), tessellation: 64, sideOrientation: Mesh.DOUBLESIDE }, scene), [0, 0, 0], rubber, wheel);
      tire.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const bead = torus('moulded sidewall bead', .55, .012, [side * .171, 0, 0], tread, wheel); bead.rotation.z = Math.PI / 2;
        const rim = cylinder('dished alloy rim', .425, .045, [side * .145, 0, 0], this.rims, wheel); rim.rotation.z = Math.PI / 2;
        const lip = torus('wheel rim rolled lip', .414, .028, [side * .17, 0, 0], this.rims, wheel); lip.rotation.z = Math.PI / 2;
        const hub = cylinder('axle dust cap', .16, .065, [side * .18, 0, 0], steel, wheel); hub.rotation.z = Math.PI / 2;
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          const bolt = cylinder('hex wheel nut', .038, .025, [side * .18, Math.sin(a) * .139, Math.cos(a) * .139], chrome, wheel, 6); bolt.rotation.z = Math.PI / 2;
        }
      }
      for (let i = 0; i < 36; i++) for (const side of [-1, 1]) {
        const a = i * Math.PI / 18;
        const lug = box('chevron tread', [.13, .015, .028], [side * .09, Math.cos(a) * .384, Math.sin(a) * .384], tread, .006, wheel);
        lug.rotation.x = a; lug.rotation.y = side * .32;
      }
    }

    box('operator floor pan', [1.21, .085, 1.08], [0, .04, .2], dark, .035);
    for (let i = 0; i < 9; i++) box('floor mat rib', [.92, .016, .018], [0, .089, -.16 + i * .082], rubber, .006);
    box('seat suspension pedestal', [.43, .22, .41], [0, .37, -.33], steel, .04);
    for (let i = 0; i < 4; i++) box('seat suspension bellows', [.49, .04, .45], [0, .32 + i * .045, -.33], rubber, .018);
    box('sculpted seat cushion', [.62, .18, .62], [0, .56, -.24], seat, .085);
    for (const x of [-.29, .29]) box('seat side bolster', [.115, .19, .54], [x, .61, -.24], seat, .055);
    const back = box('contoured seat back', [.62, .62, .18], [0, .89, -.51], seat, .085); back.rotation.x = -.12;
    for (const x of [-.275, .275]) { const bolster = box('backrest bolster', [.13, .48, .19], [x, .88, -.445], seat, .06); bolster.rotation.x = -.12; }
    box('lumbar cushion', [.38, .15, .065], [0, .77, -.384], rubber, .03);
    box('seat belt buckle', [.065, .1, .07], [.37, .58, -.32], red, .025);
    for (const x of [-.32, .32]) tube('seat arm rest', [[x, .6, -.44], [x, .82, -.4], [x, .84, -.04]], .035, seat);

    // Bent structural guard surrounds an open, ribbed overhead roof.
    for (const x of [-.77, .77]) {
      tube('bent rear guard post', [[x, .33, -.92], [x, 1.79, -.82], [x, 2.12, -.68], [x, 2.16, -.5], [x, 2.16, .7], [x, 2.06, .82], [x, .31, .77]], .055, this.frame);
      box('roof side beam', [.13, .12, 1.73], [x, 2.16, .02], this.frame, .045);
      tube('mirror stalk', [[x, 1.88, .69], [x * 1.18, 1.99, .72], [x * 1.3, 1.99, .72]], .017, steel);
      box('rounded mirror housing', [.2, .28, .07], [x * 1.3, 1.96, .72], dark, .033);
      box('mirror reflective face', [.163, .233, .009], [x * 1.3, 1.96, .68], chrome, .004);
    }
    for (const z of [-.79, .86]) box('overhead cross member', [1.7, .14, .15], [0, 2.16, z], this.paint, .055);
    for (let i = 0; i < 6; i++) box('overhead safety slat', [.065, .065, 1.56], [-.58 + i * .232, 2.17, .035], this.frame, .018);
    box('curved weather canopy', [1.65, .07, 1.78], [0, 2.235, .025], this.paint, .034, this.canopy);
    for (const x of [-.8, .8]) box('canopy rain gutter', [.035, .04, 1.75], [x, 2.25, .025], this.frame, .014, this.canopy);
    cylinder('beacon rubber mount', .22, .06, [.62, 2.28, -.55], rubber);
    const beacon = place(CreateLathe('rounded amber beacon', { shape: [[0, 0], [.095, 0], [.095, .11], [.083, .15], [.05, .17], [0, .18]].map(([r, y]) => new Vector3(r, y, 0)), tessellation: 40 }, scene), [.62, 2.31, -.55], amber);
    for (let i = 0; i < 3; i++) torus('beacon lens ring', .19, .007, [0, .035 + i * .03, 0], amber, beacon);

    box('dashboard console', [.91, .28, .29], [0, .78, .62], steel, .075);
    const screen = mat('instrument glass', '#183732', .05, .24); screen.emissiveColor = Color3.FromHexString('#285d47');
    const display = box('inset instrument display', [.27, .018, .13], [-.21, .929, .59], screen, .008); display.rotation.x = -.16;
    for (let i = 0; i < 4; i++) box('dashboard indicator', [.025, .017, .028], [-.3 + i * .05, .946, .58], this.lenses, .006);
    tube('angled steering column', [[-.13, .15, .55], [-.13, .71, .47], [-.13, .95, .34]], .04, steel);
    const steeringTilt = node('steering column rake'); steeringTilt.position.set(-.13, .98, .33); steeringTilt.rotation.x = -.4;
    this.steering = node('steering wheel rotation', steeringTilt);
    torus('steering wheel rim', .37, .036, [0, 0, 0], rubber, this.steering);
    cylinder('steering wheel center', .105, .05, [0, 0, 0], steel, this.steering);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      tube('steering spoke', [[0, 0, 0], [Math.sin(a) * .17, 0, Math.cos(a) * .17]], .013, steel, this.steering);
    }
    cylinder('steering spinner knob', .06, .055, [.145, .045, 0], rubber, this.steering);
    for (const x of [.31, .44]) {
      tube('hydraulic control lever', [[x, .55, .35], [x, .85, .27]], .012, chrome);
      box('ergonomic lever knob', [.065, .09, .08], [x, .87, .26], rubber, .03);
    }
    for (const x of [-.25, .2]) { const pedal = box('ribbed driving pedal', [.17, .06, .23], [x, .15, .57], rubber, .02); pedal.rotation.x = -.35; }

    // Animate the mast separately from the authored carriage collision shape.
    this.mast = node('tilting mast'); this.mast.position.set(0, -.52, 1.4);
    this.innerMast = node('telescoping inner mast', this.mast);
    for (const x of [-.68, .68]) {
      box('mast channel web', [.075, 2.9, .22], [x, 1.35, -.14], steel, .018, this.mast);
      for (const z of [-.24, -.04]) box('mast channel flange', [.18, 2.9, .045], [x, 1.35, z], steel, .012, this.mast);
      box('sliding inner rail', [.09, 2.55, .1], [x * .82, 1.22, -.105], chrome, .018, this.innerMast);
    }
    for (const y of [.1, 2.74]) box('mast cross tie', [1.42, .12, .2], [0, y, -.14], steel, .025, this.mast);
    box('hydraulic crosshead', [1.17, .09, .17], [0, 2.47, -.14], steel, .025, this.innerMast);
    for (const x of [-.43, .43]) {
      cylinder('lift cylinder barrel', .135, 1.14, [x, .52, -.16], steel, this.mast);
      cylinder('hydraulic gland', .16, .075, [x, 1.08, -.16], chrome, this.mast);
      const rod = cylinder('telescoping polished piston', .073, 1, [x, 1.12, -.16], chrome, this.mast); this.pistons.push(rod);
      const pulley = cylinder('lift chain sheave', .18, .1, [x, 2.47, -.12], steel, this.innerMast); pulley.rotation.z = Math.PI / 2;
      tube('hydraulic supply hose', [[x, .0, -.23], [x + .12, .22, -.31], [x + .12, .62, -.31], [x, .9, -.22]], .018, rubber, this.mast);
      for (let i = 0; i < 31; i++) box('roller chain link', [.048, .035, .03], [x, .13 + i * .074, .015], forkSteel, .008, this.innerMast);
    }
    for (const x of [-.62, .62]) place(forgedFork('forged tapered tine', scene), [x, 0, 0], forkSteel, forkRoot);
    for (const y of [.22, 1.1]) box('carriage cross rail', [1.58, .12, .14], [0, y, -.04], steel, .025, forkRoot);
    for (const x of [-.74, .74]) box('backrest outer frame', [.08, 1.02, .1], [x, .61, -.04], steel, .023, forkRoot);
    for (let i = 0; i < 7; i++) box('load backrest grille', [.025, .78, .035], [-.57 + i * .19, .66, -.04], steel, .01, forkRoot);
    for (const x of [-.62, .62]) box('fork locking pin', [.1, .075, .1], [x, 1.0, .04], chrome, .02, forkRoot);

    for (const x of [-.63, .63]) {
      box('front work lamp housing', [.27, .2, .15], [x, 1.99, .92], dark, .055);
      box('front work lamp lens', [.21, .135, .025], [x, 1.99, 1.007], this.lenses, .012);
    }
    box('utility lamp bar', [1.36, .13, .19], [0, 2.3, .7], steel, .04, this.utility);
    for (let i = 0; i < 8; i++) box('utility LED lens', [.11, .075, .02], [-.52 + i * .15, 2.3, .805], this.lenses, .009, this.utility);
    box('utility tool case', [.52, .23, .31], [.42, .81, -.83], steel, .05, this.utility);
    tube('case handle', [[.3, .93, -.83], [.3, .98, -.83], [.5, .98, -.83], [.5, .93, -.83]], .014, rubber, this.utility);
    const extinguisher = place(CreateLathe('fire extinguisher vessel', { shape: [[0, 0], [.055, 0], [.087, .035], [.087, .39], [.055, .44], [.027, .45]].map(([r, y]) => new Vector3(r, y, 0)), tessellation: 32 }, scene), [-.96, -.04, -.57], red, this.utility);
    for (const y of [.12, .32]) torus('extinguisher mounting strap', .18, .018, [0, y, 0], steel, extinguisher);
    tube('extinguisher nozzle', [[-.96, .43, -.57], [-.84, .45, -.57], [-.83, .15, -.57]], .012, rubber, this.utility);
    box('extinguisher handle', [.14, .026, .055], [-.96, .44, -.57], steel, .01, this.utility);
    f.label('NORTHLINE', .64, .09, [0, .431, -1.365], '#dae0df', '#202629', false, root);
    f.label('07', .2, .13, [0, -.215, -1.411], '#dae0df', '#202629', false, root);
    for (const side of [-1, 1]) {
      const badge = f.label('N 25', .3, .12, [side * .9, .32, -.72], '#dae0df', '#202629', false, root);
      badge.rotation.y = -side * Math.PI / 2;
    }
    // Batch leaf meshes by material AND parent, preserving animated/optional assemblies.
    // The detailed tread, chains and cockpit therefore add geometry, not hundreds of draws.
    const meshes = [...root.getChildMeshes(), ...forkRoot.getChildMeshes()].filter((m): m is Mesh => m instanceof Mesh);
    const batches = new Map<TransformNode, Map<Material, Mesh[]>>();
    for (const m of meshes) {
      if (!m.material || !(m.parent instanceof TransformNode) || m.getChildren().length || !(m.material instanceof PBRMaterial) || this.pistons.includes(m)) continue;
      let byMat = batches.get(m.parent); if (!byMat) { byMat = new Map(); batches.set(m.parent, byMat); }
      const group = byMat.get(m.material) ?? []; group.push(m); byMat.set(m.material, group);
    }
    root.computeWorldMatrix(true); forkRoot.computeWorldMatrix(true);
    for (const [parent, byMat] of batches) for (const [material, group] of byMat) {
      if (group.length < 2) continue;
      parent.computeWorldMatrix(true);
      for (const mesh of group) mesh.computeWorldMatrix(true);
      const merged = Mesh.MergeMeshes(group, true, true);
      if (!merged) continue;
      // MergeMeshes bakes world coordinates; restore the assembly's local coordinates.
      merged.bakeTransformIntoVertices(parent.getWorldMatrix().clone().invert());
      merged.parent = parent; merged.position.setAll(0); merged.rotationQuaternion = Quaternion.Identity(); merged.scaling.setAll(1);
      merged.material = material; merged.name = `${parent.name} / ${material.name}`; merged.receiveShadows = true; merged.isPickable = false;
    }
    scene.onDisposeObservable.addOnce(() => reflection?.dispose());
  }

  applyStyle(value: TruckStyle) {
    const style = normalizeStyle(value);
    this.paint.albedoColor = Color3.FromHexString(style.paint).toLinearSpace();
    this.rims.albedoColor = Color3.FromHexString(style.rims).toLinearSpace();
    this.frame.albedoColor = Color3.FromHexString(style.frame).toLinearSpace();
    this.upholstery.albedoColor = Color3.FromHexString(style.seat).toLinearSpace();
    this.canopy.setEnabled(style.roof === 'canopy');
    this.paint.roughness = { gloss: .25, satin: .48, matte: .82 }[style.finish];
    this.paint.clearCoat.intensity = { gloss: .7, satin: .25, matte: 0 }[style.finish];
    this.stripes.setEnabled(style.stripes); this.utility.setEnabled(style.kit === 'utility');
  }
  setWorkLight(on: boolean) {
    this.lenses.albedoColor = Color3.FromHexString(on ? '#fff3d9' : '#677477').toLinearSpace();
    this.lenses.emissiveColor = on ? Color3.FromHexString('#ffe1a3').scale(.8) : Color3.Black();
  }
  setEnvironmentIntensity(intensity: number) {
    for (const material of this.materials) material.environmentIntensity = intensity;
  }
  update(dt: number, speed: number, steer: number, lift: number, tilt: number) {
    for (const wheel of this.wheels) wheel.rotation.x += speed * dt / .39;
    for (const axle of this.rearAxles) axle.rotation.y = -steer * .38;
    this.steering.rotation.y = steer * 1.3;
    this.mast.rotation.x = tilt;
    this.innerMast.position.y = Math.max(0, lift - 1.1) * .65;
    for (const rod of this.pistons) {
      const extension = 1.38 + this.innerMast.position.y;
      rod.scaling.y = extension; rod.position.y = 1.09 + extension / 2;
    }
  }
}
