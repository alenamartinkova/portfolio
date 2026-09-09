export class Input {
    keys = new Set<string>();
    pressed = new Set<string>();
    lookX = 0;
    lookY = 0;
    dragging = false;
    constructor(private canvas: HTMLCanvasElement, private pause: (force?: boolean) => void) {
        window.addEventListener('keydown', this.down);
        window.addEventListener('keyup', this.up);
        window.addEventListener('blur', this.blur);
        document.addEventListener('visibilitychange', this.visibility);
        window.addEventListener('pointerup', this.pointerUp);
        canvas.addEventListener('pointerdown', this.pointerDown);
        window.addEventListener('pointermove', this.move);
    }
    private down = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLButtonElement && ['Space', 'Enter'].includes(e.code))
            return;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
            e.preventDefault();
        if (!e.repeat) {
            this.pressed.add(e.code);
            if (e.code === 'Escape')
                this.pause();
        }
        this.keys.add(e.code);
    };
    private up = (e: KeyboardEvent) => { this.keys.delete(e.code); };
    private blur = () => { this.clear(); this.pause(true); };
    private visibility = () => { if (document.hidden) this.blur(); };
    private pointerDown = () => { this.dragging = true; this.canvas.focus(); };
    private pointerUp = () => { this.dragging = false; };
    private move = (e: PointerEvent) => { if (this.dragging) {
        this.lookX += e.movementX;
        this.lookY += e.movementY;
    } };
    consume(key: string) { const value = this.pressed.has(key); this.pressed.delete(key); return value; }
    axis(a: string, b: string) { return Number(this.keys.has(a)) - Number(this.keys.has(b)); }
    clear() { this.keys.clear(); this.pressed.clear(); this.dragging = false; }
    dispose() { window.removeEventListener('keydown', this.down); window.removeEventListener('keyup', this.up); window.removeEventListener('blur', this.blur); document.removeEventListener('visibilitychange', this.visibility); window.removeEventListener('pointerup', this.pointerUp); window.removeEventListener('pointermove', this.move); this.canvas.removeEventListener('pointerdown', this.pointerDown); }
}
