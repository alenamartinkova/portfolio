import './styles/touch-controls.css';

export type TouchGame = 'office' | 'forklift';
type Action = { code: string; en: string; sk: string; toggle?: boolean };
const actions: Record<TouchGame, Action[]> = {
  office: [
    { code: 'ShiftLeft', en: 'Sprint', sk: 'Šprint', toggle: true },
    { code: 'KeyE', en: 'Grab / drop', sk: 'Chytiť / pustiť' },
    { code: 'Space', en: 'Jump', sk: 'Skok' },
    { code: 'KeyR', en: 'Checkpoint', sk: 'Návrat' },
  ],
  forklift: [
    { code: 'KeyE', en: 'Forks ↑', sk: 'Vidlice ↑' },
    { code: 'KeyQ', en: 'Forks ↓', sk: 'Vidlice ↓' },
    { code: 'KeyT', en: 'Tilt back', sk: 'Sklon vzad' },
    { code: 'KeyG', en: 'Tilt forward', sk: 'Sklon vpred' },
    { code: 'Space', en: 'Brake', sk: 'Brzda' },
  ],
};

/** Pointer ownership keeps the joystick and action buttons independent during multitouch. */
export class TouchControls {
  private root = document.createElement('section');
  private stick = document.createElement('div');
  private knob = document.createElement('span');
  private hint = document.createElement('p');
  private buttons = new Map<Action, HTMLButtonElement>();
  private pointers = new Map<number, { element: HTMLElement; code?: string }>();
  private toggled = new Set<string>();
  private movement = new Set<string>();
  private joystick: number | null = null;
  private media = matchMedia('(any-pointer: coarse), (max-width: 760px)');
  private language = new MutationObserver(() => this.localize());
  private active = false;
  constructor(
    game: TouchGame,
    private change: (keys: Set<string>) => void,
    private gesture: () => void,
    private resetLook: () => void,
  ) {
    this.root.className = 'touch-controls';
    this.root.dataset.game = game;
    this.stick.className = 'touch-stick';
    this.stick.setAttribute('role', 'group');
    this.knob.className = 'touch-stick__knob';
    this.stick.innerHTML = '<span class="touch-stick__arrows" aria-hidden="true">↑<br>← &nbsp; →<br>↓</span>';
    this.stick.append(this.knob);
    this.hint.className = 'touch-controls__hint';
    const group = document.createElement('div');
    group.className = 'touch-actions';
    for (const action of actions[game]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.code = action.code;
      if (action.toggle) button.setAttribute('aria-pressed', 'false');
      if (action.code === 'Space') button.className = 'touch-action--primary';
      group.append(button);
      this.buttons.set(action, button);
      // Native click supports keyboard and assistive activation. Pointer holds use pointerdown/up.
      button.addEventListener('click', event => {
        if (event.detail !== 0 || !this.active) return;
        this.gesture();
        if (action.toggle) this.toggle(action.code);
        else { this.change(new Set([...this.held(), action.code])); this.emit(); }
      });
    }
    this.root.append(this.hint, this.stick, group);
    document.body.append(this.root);
    this.root.addEventListener('pointerdown', this.down);
    this.root.addEventListener('pointermove', this.move);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      this.root.addEventListener(event, this.end as EventListener);
    this.root.addEventListener('contextmenu', event => event.preventDefault());
    this.media.addEventListener('change', this.availability);
    window.addEventListener('resize', this.reset);
    this.language.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    this.localize();
    this.availability();
  }
  private localize() {
    const sk = document.documentElement.lang === 'sk';
    this.root.setAttribute('aria-label', sk ? 'Dotykové ovládanie' : 'Touch controls');
    this.stick.setAttribute('aria-label', sk ? 'Joystick — pohyb' : 'Joystick — move');
    this.hint.textContent = sk ? 'Pohyb: joystick · Pohľad: potiahni po hre' : 'Move: joystick · Look: drag the scene';
    for (const [action, button] of this.buttons) {
      button.textContent = action[sk ? 'sk' : 'en'];
      button.title = action.toggle
        ? sk ? 'Ťuknutím zapnúť / vypnúť šprint' : 'Tap to toggle sprint'
        : button.textContent;
    }
  }
  private availability = () => {
    document.body.toggleAttribute('data-touch-game', this.media.matches);
    this.reset();
    this.root.hidden = !this.active || !this.media.matches;
  };
  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.reset();
    this.root.hidden = !active || !this.media.matches;
  }
  private down = (event: PointerEvent) => {
    if (!this.active || event.button !== 0) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>('.touch-stick, button');
    if (!target) return;
    event.preventDefault();
    this.gesture();
    if (target === this.stick) {
      if (this.joystick !== null) return;
      this.joystick = event.pointerId;
      this.pointers.set(event.pointerId, { element: target });
      this.updateStick(event);
    } else {
      const code = target.dataset.code!;
      this.pointers.set(event.pointerId, { element: target, code });
      if (target.hasAttribute('aria-pressed')) this.toggle(code);
    }
    target.setPointerCapture(event.pointerId);
    this.emit();
  };
  private move = (event: PointerEvent) => {
    if (event.pointerId !== this.joystick) return;
    event.preventDefault();
    this.updateStick(event);
    this.emit();
  };
  private updateStick(event: PointerEvent) {
    const rect = this.stick.getBoundingClientRect();
    const radius = rect.width * .32;
    let x = (event.clientX - rect.left - rect.width / 2) / radius;
    let y = (event.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.max(1, Math.hypot(x, y));
    x /= length; y /= length;
    this.knob.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
    this.movement.clear();
    if (x > .3) this.movement.add('KeyD');
    if (x < -.3) this.movement.add('KeyA');
    if (y > .3) this.movement.add('KeyS');
    if (y < -.3) this.movement.add('KeyW');
  }
  private end = (event: PointerEvent) => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    this.pointers.delete(event.pointerId);
    if (event.pointerId === this.joystick) {
      this.joystick = null;
      this.movement.clear();
      this.knob.style.transform = '';
    }
    if (pointer.element.hasPointerCapture(event.pointerId)) pointer.element.releasePointerCapture(event.pointerId);
    this.emit();
  };
  private toggle(code: string) {
    if (this.toggled.has(code)) this.toggled.delete(code);
    else this.toggled.add(code);
    this.emit();
  }
  private held() {
    const keys = new Set([...this.movement, ...this.toggled]);
    for (const pointer of this.pointers.values())
      if (pointer.code && !pointer.element.hasAttribute('aria-pressed')) keys.add(pointer.code);
    return keys;
  }
  private emit() {
    const keys = this.held();
    for (const [action, button] of this.buttons) {
      button.classList.toggle('is-held', keys.has(action.code));
      if (action.toggle) button.setAttribute('aria-pressed', String(keys.has(action.code)));
    }
    this.change(keys);
  }
  reset = () => {
    const pointers = [...this.pointers];
    this.pointers.clear();
    this.joystick = null;
    this.movement.clear();
    this.toggled.clear();
    this.knob.style.transform = '';
    for (const [id, { element }] of pointers)
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    this.emit();
    this.resetLook();
  };
  dispose() {
    this.reset();
    this.language.disconnect();
    this.media.removeEventListener('change', this.availability);
    window.removeEventListener('resize', this.reset);
    this.root.remove();
    document.body.removeAttribute('data-touch-game');
  }
}
