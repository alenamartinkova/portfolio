import { GameInput } from '../../../../shared/GameInput';

export class Input extends GameInput {
  constructor(canvas: HTMLCanvasElement, pause: (force?: boolean) => void) {
    super(canvas, 'office', pause);
  }
}
