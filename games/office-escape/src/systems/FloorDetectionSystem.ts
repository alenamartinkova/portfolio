export class FloorDetectionSystem {
    private contact = 0;
    update(dt: number, onForbiddenFloor: boolean, fallenOut = false) {
        this.contact = onForbiddenFloor ? this.contact + dt : 0;
        return fallenOut || this.contact >= .085;
    }
    reset() { this.contact = 0; }
}
