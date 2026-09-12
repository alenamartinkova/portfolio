import { GameInput } from '../../../../shared/GameInput';

export class Input extends GameInput {
  constructor(
    canvas: HTMLCanvasElement,
    onPause: (force?: boolean) => void,
    onRetry: () => void,
    onGesture: () => void,
    onLight: () => void = () => {},
  ) {
    super(canvas, 'forklift', onPause, onGesture, code => {
      if (code === 'KeyR') onRetry();
      if (code === 'KeyF') onLight();
    });
  }
}
