import { InspectionSystem } from "./InspectionSystem";
import type { TextKey } from "../i18n";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Cargo } from "../world/Cargo";
import { ForkliftController } from "../player/ForkliftController";
import { firstMission } from "../missions/levels";
export { firstMission, type MissionDefinition } from "../missions/levels";
export function deliveryEligible(
  position: { x: number; y: number; z: number },
  speed: number,
  upright: number,
  forksClear: boolean,
  target = firstMission.target,
) {
  return (
    Math.abs(position.x - target.x) < target.width / 2 - 1.65 &&
    Math.abs(position.z - target.z) < target.depth / 2 - 1.65 &&
    position.y < 0.16 &&
    position.y > -0.1 &&
    speed < 0.22 &&
    upright > 0.93 &&
    forksClear
  );
}
export class MissionManager {
  inspections: InspectionSystem;
  seconds = 0;
  hold = 0;
  delivered = false;
  pickedUp = false;
  started = false;
  hint: TextKey = "hintApproach";
  stage = 0;
  constructor(
    public cargo: Cargo,
    public truck: ForkliftController,
    public definition = firstMission,
  ) { this.inspections = new InspectionSystem(definition.inspections); }
  update(dt: number, active: boolean) {
    if (this.delivered) return;
    if (active) this.started = true;
    if (this.started) this.seconds += dt;
    const p = this.cargo.root.position;
    const distance = Vector3.Distance(p, this.truck.root.position);
    if (p.y > 0.28 && distance < 4.8) this.pickedUp = true;
    this.inspections.update(dt, p, this.cargo.speed, this.cargo.root.getDirection(Vector3.Up()).y, this.pickedUp && distance < 4.8);
    const inBay =
      Math.abs(p.x - this.definition.target.x) <
        this.definition.target.width / 2 &&
      Math.abs(p.z - this.definition.target.z) <
        this.definition.target.depth / 2;
    const forkTip = this.truck.forkRoot.position.add(
      this.truck.forward.scale(1.1),
    );
    const clear =
      Vector3.Distance(
        new Vector3(p.x, 0, p.z),
        new Vector3(forkTip.x, 0, forkTip.z),
      ) > 2.45;
    this.hold = this.pickedUp && this.inspections.complete && deliveryEligible(
      p,
      this.cargo.speed,
      this.cargo.root.getDirection(Vector3.Up()).y,
      clear,
      this.definition.target,
    )
      ? this.hold + dt
      : 0;
    if (this.hold > 1.1) {
      this.delivered = true;
      this.stage = 3;
    } else if (this.cargo.root.getDirection(Vector3.Up()).y < 0.7) {
      this.hint = "hintTipped";
    } else if (!this.inspections.complete && this.pickedUp && p.y > .2 && distance < 4.8) {
      this.stage = 1;
      this.hint = "inspectionHint";
    } else if (inBay && !this.inspections.complete) {
      this.stage = 1;
      this.hint = "inspectionHint";
    } else if (inBay) {
      this.stage = 2;
      this.hint =
        Math.abs(p.x - this.definition.target.x) >=
          this.definition.target.width / 2 - 1.65 ||
        Math.abs(p.z - this.definition.target.z) >=
          this.definition.target.depth / 2 - 1.65
          ? "hintCenter"
          : p.y > 0.16
            ? "hintLower"
            : clear
              ? "hintSettle"
              : "hintWithdraw";
    } else if (this.pickedUp && p.y > 0.2 && distance < 4.8) {
      this.stage = 1;
      this.hint = this.truck.lift > 1.3 ? "hintLow" : (this.definition.inspections.length ? "routeReady" : this.definition.routeHint);
    } else if (distance < 4.6) {
      this.stage = 0;
      this.hint = this.truck.lift > 0.5 ? "hintFit" : "hintLift";
    } else {
      this.stage = 0;
      this.hint = this.pickedUp ? "hintRecover" : "hintDrive";
    }
  }
}
