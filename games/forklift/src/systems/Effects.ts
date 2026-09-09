import { Mesh, Scene, Vector3 } from "@babylonjs/core";
import { Factory } from "../world/Factory";
export class Effects {
  private sparks: { mesh: Mesh; v: Vector3; life: number }[] = [];
  private marks: Mesh[] = [];
  private skidAt = 0;
  constructor(
    private f: Factory,
    private scene: Scene,
  ) {}
  impact(strength: number, pos: Vector3) {
    if (strength < 1.8) return;
    for (let i = 0; i < 8; i++) {
      const m = this.f.box(
        "impact spark",
        [0.035, 0.035, 0.12],
        pos.asArray(),
        "#ffd48a",
      );
      m.material = this.f.mat("#ffd48a", true);
      m.isPickable = false;
      this.sparks.push({
        mesh: m,
        v: new Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 3,
          (Math.random() - 0.5) * 3,
        ),
        life: 0.3 + Math.random() * 0.2,
      });
    }
  }
  update(dt: number, pos: Vector3, yaw: number, skid: boolean) {
    for (const s of this.sparks) {
      s.life -= dt;
      s.v.y -= dt * 8;
      s.mesh.position.addInPlace(s.v.scale(dt));
      s.mesh.scaling.scaleInPlace(0.97);
    }
    this.sparks = this.sparks.filter((s) => {
      if (s.life <= 0) {
        s.mesh.dispose();
        return false;
      }
      return true;
    });
    this.skidAt -= dt;
    if (skid && this.skidAt <= 0) {
      this.skidAt = 0.09;
      for (const x of [-0.86, 0.86]) {
        const m = this.f.box(
          "tire mark",
          [0.21, 0.006, 0.46],
          [pos.x + Math.cos(yaw) * x, 0.023, pos.z - Math.sin(yaw) * x],
          "#657475",
        );
        m.rotation.y = yaw;
        m.isPickable = false;
        this.marks.push(m);
      }
      while (this.marks.length > 80) this.marks.shift()!.dispose();
    }
  }
}
