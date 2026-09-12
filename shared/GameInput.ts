import { TouchControls, type TouchGame } from './TouchControls';

/** Shared keyboard, multitouch and camera input for the two physics games. */
export class GameInput {
  keys = new Set<string>();
  pressed = new Set<string>();
  lookX = 0;
  lookY = 0;
  dragging = false;
  private keyboard = new Set<string>();
  private touchKeys = new Set<string>();
  private lookPointer: { id: number; x: number; y: number } | null = null;
  private touch: TouchControls;
  constructor(
    private canvas: HTMLCanvasElement,
    game: TouchGame,
    private pause: (force?: boolean) => void,
    private gesture: () => void = () => {},
    private action: (code: string) => void = () => {},
  ) {
    this.touch = new TouchControls(game, this.setTouchKeys, gesture, this.clearLook);
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('blur', this.blur);
    document.addEventListener('visibilitychange', this.visibility);
    canvas.addEventListener('pointerdown', this.pointerDown);
    window.addEventListener('pointermove', this.move);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      canvas.addEventListener(event, this.pointerUp as EventListener);
  }
  setActive(active: boolean) { this.clear(); this.touch.setActive(active); }
  private press(code: string) {
    if (this.keys.has(code)) return;
    this.keys.add(code);
    this.pressed.add(code);
    if (code === 'Escape') this.pause();
    else this.action(code);
  }
  private setTouchKeys = (next: Set<string>) => {
    const previous = this.touchKeys;
    this.touchKeys = next;
    for (const code of previous) if (!next.has(code) && !this.keyboard.has(code)) this.keys.delete(code);
    for (const code of next) if (!previous.has(code)) this.press(code);
  };
  private down = (event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (target instanceof HTMLButtonElement && ['Space', 'Enter'].includes(event.code)) return;
    if (/^(Space|Arrow\w+|Key[WASDQETGRF]|ShiftLeft|ShiftRight|Escape)$/.test(event.code)) event.preventDefault();
    this.gesture();
    if (event.repeat) return;
    this.keyboard.add(event.code);
    this.press(event.code);
  };
  private up = (event: KeyboardEvent) => {
    this.keyboard.delete(event.code);
    if (!this.touchKeys.has(event.code)) this.keys.delete(event.code);
  };
  private blur = () => { this.clear(); this.pause(true); };
  private visibility = () => { if (document.hidden) this.blur(); };
  private pointerDown = (event: PointerEvent) => {
    if (this.lookPointer || event.button !== 0) return;
    this.lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.dragging = true;
    this.gesture();
    this.canvas.focus({ preventScroll: true });
    this.canvas.setPointerCapture(event.pointerId);
  };
  private pointerUp = (event: PointerEvent) => {
    if (event.pointerId === this.lookPointer?.id) this.clearLook();
  };
  private move = (event: PointerEvent) => {
    if (!this.lookPointer || event.pointerId !== this.lookPointer.id) return;
    this.lookX += event.clientX - this.lookPointer.x;
    this.lookY += event.clientY - this.lookPointer.y;
    this.lookPointer.x = event.clientX;
    this.lookPointer.y = event.clientY;
  };
  private clearLook = () => {
    const id = this.lookPointer?.id;
    this.lookPointer = null;
    this.dragging = false;
    this.lookX = this.lookY = 0;
    if (id !== undefined && this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
  };
  consume(key: string) { const value = this.pressed.has(key); this.pressed.delete(key); return value; }
  axis(positive: string, negative: string) { return Number(this.keys.has(positive)) - Number(this.keys.has(negative)); }
  clear() {
    this.keyboard.clear();
    this.touch.reset();
    this.keys.clear();
    this.pressed.clear();
    this.clearLook();
  }
  dispose() {
    this.clear();
    this.touch.dispose();
    window.removeEventListener('keydown', this.down);
    window.removeEventListener('keyup', this.up);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('visibilitychange', this.visibility);
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    window.removeEventListener('pointermove', this.move);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      this.canvas.removeEventListener(event, this.pointerUp as EventListener);
  }
}
