import { firstMission, type MissionDefinition } from "../missions/levels";
import { t } from "../i18n";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Factory } from "./Factory";
import { compoundBody } from "../systems/Physics";
export class Cargo {
  root: TransformNode;
  body: PhysicsBody;
  readonly initialPosition: Vector3;
  readonly mass: number;
  readonly fragility: number;
  constructor(f: Factory, definition: MissionDefinition = firstMission) {
    this.initialPosition = new Vector3(
      definition.pickup[0],
      0.02,
      definition.pickup[1],
    );
    this.mass = definition.mass;
    this.fragility = definition.fragility;
    this.root = new TransformNode(definition.cargo, f.scene);
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
    if (definition.cargo === "piano") {
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
    } else if (definition.cargo === "ceramics") {
      // One stable compound load: a protective shipping frame with four porcelain vases.
      for (const x of [-1.2, 1.2])
        for (const z of [-0.7, 0.7])
          box(
            "shipping frame upright",
            [0.1, 2.15, 0.1],
            [x, 1.5, z],
            "#8673a5",
          );
      for (const y of [0.55, 1.15, 2.55]) {
        for (const z of [-0.7, 0.7])
          box("shipping frame rail", [2.5, 0.1, 0.1], [0, y, z], "#a494c0");
        for (const x of [-1.2, 1.2])
          box("shipping frame rail", [0.1, 0.1, 1.5], [x, y, 0], "#a494c0");
      }
      for (const x of [-0.6, 0.6])
        for (const z of [-0.35, 0.35]) {
          f.cylinder(
            "porcelain vase base",
            0.62,
            0.18,
            [x, 0.56, z],
            "#f5ecdd",
            this.root,
          );
          f.cylinder(
            "porcelain vase body",
            0.82,
            0.85,
            [x, 1.04, z],
            "#e7dacf",
            this.root,
          );
          f.cylinder(
            "porcelain shoulder",
            0.62,
            0.3,
            [x, 1.61, z],
            "#f5ecdd",
            this.root,
          );
          f.cylinder(
            "porcelain neck",
            0.33,
            0.48,
            [x, 1.97, z],
            "#e7dacf",
            this.root,
          );
          f.cylinder(
            "cobalt rim",
            0.4,
            0.08,
            [x, 2.23, z],
            "#596baf",
            this.root,
          );
          f.cylinder(
            "cobalt band",
            0.83,
            0.12,
            [x, 1.28, z],
            "#596baf",
            this.root,
          );
        }
      f.label(
        () => t("fragile"),
        1.5,
        0.26,
        [0, 0.87, -0.76],
        "#f2ede5",
        "#655887",
        false,
        this.root,
      );
    } else {
      box("generator engine", [2.38, 1.4, 1.32], [0, 1.2, 0], "#567563");
      box("generator roof", [2.5, 0.12, 1.43], [0, 1.96, 0], "#344c46");
      for (const x of [-1.17, 1.17])
        box("orange corner guard", [0.12, 1.5, 1.4], [x, 1.22, 0], "#dfa94d");
      for (let i = 0; i < 9; i++)
        box(
          "cooling vent",
          [0.95, 0.048, 0.035],
          [-0.38, 0.8 + i * 0.1, -0.68],
          "#213b36",
        );
      box("control panel", [0.64, 0.64, 0.035], [0.65, 1.3, -0.68], "#203a35");
      box(
        "status display",
        [0.43, 0.16, 0.025],
        [0.65, 1.45, -0.71],
        "#a1dcbd",
      );
      for (const x of [0.5, 0.77])
        box("control button", [0.1, 0.1, 0.04], [x, 1.2, -0.71], "#dfa94d");
      f.cylinder(
        "exhaust",
        0.16,
        0.45,
        [0.75, 2.19, 0.3],
        "#334340",
        this.root,
      );
      f.label(
        "540 kg",
        0.85,
        0.22,
        [0, 1.76, -0.685],
        "#22392f",
        "#e6bc62",
        false,
        this.root,
      );
    }
    this.body = compoundBody(
      this.root,
      [
        ...[-1.18, 0, 1.18].map((x) => ({
          size: [0.18, 0.32, 1.9],
          position: [x, 0.16, 0],
        })),
        { size: [2.8, 0.14, 1.9], position: [0, 0.39, 0] },
        definition.cargo === "piano"
          ? { size: [2.45, 1.6, 0.85], position: [0, 1.24, 0.2] }
          : {
              size: [2.5, definition.cargo === "ceramics" ? 2.15 : 1.55, 1.5],
              position: [0, definition.cargo === "ceramics" ? 1.55 : 1.24, 0],
            },
      ],
      this.mass,
      false,
      0.9,
    );
    this.body.setMassProperties({
      mass: this.mass,
      centerOfMass: new Vector3(
        0,
        definition.cargo === "ceramics" ? 0.7 : 0.52,
        0.05,
      ),
    });
    this.body.setAngularDamping(1.5);
  }
  get speed() {
    return this.body.getLinearVelocity().length();
  }
}
