import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Factory } from '../world/Factory';

/** Articulated visual rig, independent of the character's physics capsule. */
export class EmployeeModel {
  private hips: TransformNode[] = [];
  private knees: TransformNode[] = [];
  private shoulders: TransformNode[] = [];
  private elbows: TransformNode[] = [];
  private body: TransformNode;
  private time = 0;
  constructor(f: Factory, root: TransformNode) {
    this.body = new TransformNode('employee posture', f.scene); this.body.parent = root;
    const body = this.body;
    const skin = '#d5a17f', shirt = '#e7dfcd', trousers = '#364e56', leather = '#30343a';
    f.sphere('shirt torso', [.49, .64, .31], [0, 1.06, 0], shirt, body);
    f.box('shirt front', [.35, .45, .26], [0, 1.04, .025], shirt, body);
    f.box('shirt button placket', [.032, .43, .012], [0, 1.08, .16], '#d7cdb9', body);
    for (let i = 0; i < 4; i++) f.sphere('shirt button', [.014, .014, .01], [0, .95 + i * .085, .171], '#8c887d', body);
    f.sphere('trouser hips', [.42, .22, .3], [0, .76, 0], trousers, body);
    f.box('leather belt', [.42, .045, .29], [0, .84, 0], leather, body);
    f.box('metal belt buckle', [.065, .045, .02], [0, .84, .154], '#b9b7aa', body);
    f.cylinder('neck', .14, .14, [0, 1.38, 0], skin, body);
    f.sphere('head', [.32, .4, .31], [0, 1.59, 0], skin, body);
    f.sphere('hair cap', [.335, .22, .32], [0, 1.73, -.018], '#423932', body);
    f.sphere('swept hair', [.3, .12, .21], [-.026, 1.79, .055], '#423932', body);
    f.sphere('nose', [.07, .09, .08], [0, 1.57, .156], skin, body);
    for (const side of [-1, 1]) {
      f.sphere('ear', [.065, .105, .065], [side * .159, 1.58, -.003], skin, body);
      f.sphere('eye', [.031, .025, .014], [side * .068, 1.63, .143], '#353330', body);
      const collar = f.box('shirt collar', [.13, .09, .06], [side * .073, 1.34, .115], '#f4eedf', body);
      collar.rotation.z = side * .42;
      const hip = new TransformNode('hip joint', f.scene); hip.parent = body; hip.position.set(side * .12, .76, 0);
      f.sphere('trouser thigh', [.205, .4, .24], [0, -.17, 0], trousers, hip);
      const knee = new TransformNode('knee joint', f.scene); knee.parent = hip; knee.position.y = -.33;
      f.sphere('trouser shin', [.175, .34, .2], [0, -.14, 0], trousers, knee);
      f.box('shoe sole', [.19, .052, .34], [0, -.367, .055], '#1f262b', knee);
      f.sphere('leather shoe', [.19, .14, .34], [0, -.3, .057], leather, knee);
      for (let i = 0; i < 3; i++) f.box('shoe lace', [.11, .009, .012], [0, -.23 - i * .005, .025 + i * .027], '#747472', knee);
      const shoulder = new TransformNode('shoulder joint', f.scene); shoulder.parent = body; shoulder.position.set(side * .24, 1.27, 0);
      f.sphere('shirt sleeve', [.18, .32, .205], [side * .025, -.12, 0], shirt, shoulder);
      const elbow = new TransformNode('elbow joint', f.scene); elbow.parent = shoulder; elbow.position.set(side * .025, -.26, 0);
      f.sphere('forearm sleeve', [.135, .24, .15], [0, -.1, 0], shirt, elbow);
      f.cylinder('shirt cuff', .143, .052, [0, -.2, 0], '#f4eedf', elbow);
      f.sphere('hand', [.115, .145, .105], [0, -.28, .008], skin, elbow);
      if (side < 0) {
        f.box('watch strap', [.147, .045, .13], [0, -.205, 0], leather, elbow);
        f.box('watch metal face', [.06, .036, .027], [0, -.205, .075], '#a2b9b6', elbow);
      }
      this.hips.push(hip); this.knees.push(knee); this.shoulders.push(shoulder); this.elbows.push(elbow);
    }
    f.tube('lanyard', [[-.09, 1.36, .14], [-.13, 1.09, .18], [-.1, .99, .175], [.02, 1.09, .18], [.08, 1.36, .14]], .011, '#ba8057', body);
    f.box('employee badge', [.135, .17, .023], [-.09, 1.01, .192], '#f4efdf', body);
    f.box('badge portrait', [.045, .055, .006], [-.12, 1.035, .206], '#698b88', body);
    for (let i = 0; i < 2; i++) f.box('badge print', [.066, .009, .006], [-.074, .991 - i * .023, .206], '#858f88', body);
  }
  update(dt: number, moving: boolean, grounded: boolean, dragging: boolean) {
    this.time += dt * (moving ? 10 : 2);
    const stride = moving && grounded ? .55 : 0;
    this.body.position.y = grounded && moving ? Math.abs(Math.sin(this.time)) * .025 : 0;
    this.body.rotation.x = moving ? .06 : 0;
    for (let i = 0; i < 2; i++) {
      const phase = this.time + i * Math.PI, swing = Math.sin(phase) * stride;
      this.hips[i].rotation.x = grounded ? swing : (i ? .25 : -.55);
      this.knees[i].rotation.x = grounded ? -Math.max(0, Math.cos(phase)) * stride * .8 : -.65;
      this.shoulders[i].rotation.x = dragging ? -1.1 : grounded ? -swing * .8 : -1;
      this.elbows[i].rotation.x = dragging ? -.35 : -.18 - Math.max(0, swing) * .5;
    }
  }
}
