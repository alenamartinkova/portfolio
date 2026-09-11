import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { route, type Stop } from '../world/levels';
import { PLAYER_HEIGHT } from '../player/PlayerController';
export class CheckpointManager {
    current = 0;
    constructor(private path: Stop[] = route) {}
    get stops() { return this.path.filter(s => s.checkpoint !== undefined); }
    get spawn() { const s = this.stops[this.current]; return new Vector3(s.x, s.y + PLAYER_HEIGHT / 2 + .09, s.z); }
    update(p: Vector3, grounded: boolean, allowed: (checkpoint: number) => boolean = () => true) {
        if (!grounded)
            return false;
        for (let i = this.current + 1; i < this.stops.length; i++) {
            const s = this.stops[i];
            if (allowed(i) && Math.abs(p.x - s.x) < s.w / 2 && Math.abs(p.z - s.z) < s.d / 2 && Math.abs(p.y - PLAYER_HEIGHT / 2 - s.y) < .22) {
                this.current = i;
                return true;
            }
        }
        return false;
    }
}
