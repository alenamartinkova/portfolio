export class Input {
  keys = new Set<string>();
  lookX = 0;
  lookY = 0;
  dragging = false;
  constructor(
    private canvas: HTMLCanvasElement,
    private onPause: (force?: boolean) => void,
    private onRetry: () => void,
    private onGesture: () => void,
  ) {
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
    canvas.addEventListener("pointerdown", this.pointerDown);
    window.addEventListener("pointerup", this.pointerUp);
    window.addEventListener("pointermove", this.move);
  }
  private down = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLButtonElement &&
      (e.code === "Space" || e.code === "Enter")
    )
      return;
    if (
      [
        "Space",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "KeyQ",
        "KeyE",
        "KeyT",
        "KeyG",
        "KeyR",
        "Escape",
      ].includes(e.code)
    )
      e.preventDefault();
    this.onGesture();
    if (!e.repeat && e.code === "Escape") this.onPause();
    if (!e.repeat && e.code === "KeyR") this.onRetry();
    this.keys.add(e.code);
  };
  private up = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private blur = () => {
    this.keys.clear();
    this.dragging = false;
    this.onPause(true);
  };
  private visibility = () => {
    if (document.hidden) this.blur();
  };
  private pointerDown = () => {
    this.dragging = true;
    this.onGesture();
    this.canvas.focus();
  };
  private pointerUp = () => {
    this.dragging = false;
  };
  private move = (e: PointerEvent) => {
    if (this.dragging) {
      this.lookX += e.movementX;
      this.lookY += e.movementY;
    }
  };
  axis(positive: string, negative: string) {
    return Number(this.keys.has(positive)) - Number(this.keys.has(negative));
  }
  dispose() {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.visibility);
    this.canvas.removeEventListener("pointerdown", this.pointerDown);
    window.removeEventListener("pointerup", this.pointerUp);
    window.removeEventListener("pointermove", this.move);
  }
}
