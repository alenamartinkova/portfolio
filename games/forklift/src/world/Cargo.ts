import { t } from "../i18n";
import { PhysicsBody, TransformNode, Vector3 } from "@babylonjs/core";
import { Factory } from "./Factory";
import { compoundBody } from "../systems/Physics";
export class Cargo {
  root: TransformNode;
  body: PhysicsBody;
  readonly initialPosition = new Vector3(0, 0.02, -5);
  constructor(f: Factory) {
    this.root = new TransformNode("piano", f.scene);
    this.root.position.copyFrom(this.initialPosition);
    const box = (name: string, s: number[], p: number[], c: string) =>
      f.box(name, s, p, c, this.root);
    for (const x of [-1.18, 0, 1.18])
      box("pallet runner", [0.18, 0.32, 1.9], [x, 0.16, 0], "#a77c48");
    for (let i = 0; i < 7; i++)
      box(
        "pallet slat",
        [2.8, 0.14, 0.23],
        [0, 0.39, -0.81 + i * 0.27],
        "#c59b60",
      );
    box("piano cabinet", [2.45, 1.45, 0.65], [0, 1.25, 0.31], "#27333b");
    box("piano lid", [2.56, 0.12, 0.77], [0, 2.04, 0.31], "#101d27");
    box("piano lower", [2.4, 0.68, 0.78], [0, 0.8, 0], "#202c34");
    box("keyboard", [2.43, 0.15, 0.4], [0, 1.32, -0.36], "#d4c49e");
    for (let i = 0; i < 28; i++) {
      box(
        "ivory key",
        [0.077, 0.045, 0.29],
        [-1.09 + i * 0.081, 1.415, -0.39],
        "#f3eadd",
      );
      if (i % 7 !== 2 && i % 7 !== 6)
        box(
          "black key",
          [0.043, 0.07, 0.17],
          [-1.05 + i * 0.081, 1.445, -0.32],
          "#101b22",
        );
    }
    for (const x of [-1.08, 1.08])
      box("piano leg", [0.14, 0.65, 0.15], [x, 0.78, -0.54], "#27333b");
    for (const x of [-0.19, 0, 0.19])
      box("brass pedal", [0.09, 0.05, 0.22], [x, 0.57, -0.55], "#d5b967");
    box("brass trim", [2.4, 0.025, 0.02], [0, 1.84, -0.025], "#c6a568");
    f.label(
      "FELDMAN & SONS",
      1.2,
      0.16,
      [0, 1.73, -0.024],
      "#ddca93",
      "#27333b",
      false,
      this.root,
    );
    f.label(
      () => t("fragile"),
      1.12,
      0.23,
      [0, 0.87, -0.402],
      "#152732",
      "#e6bc62",
      false,
      this.root,
    );
    this.body = compoundBody(
      this.root,
      [
        ...[-1.18, 0, 1.18].map((x) => ({
          size: [0.18, 0.32, 1.9],
          position: [x, 0.16, 0],
        })),
        { size: [2.8, 0.14, 1.9], position: [0, 0.39, 0] },
        { size: [2.45, 1.6, 0.85], position: [0, 1.24, 0.2] },
      ],
      240,
      false,
      0.9,
    );
    this.body.setMassProperties({
      mass: 240,
      centerOfMass: new Vector3(0, 0.52, 0.05),
    });
    this.body.setAngularDamping(1.5);
  }
  get speed() {
    return this.body.getLinearVelocity().length();
  }
}
