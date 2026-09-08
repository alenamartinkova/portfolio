export interface BoardAppearance {
  readonly background: string;
  readonly surface: string;
  readonly accent: string;
  readonly text: string;
  readonly theme: 'dark' | 'light';
}

export const DEFAULT_APPEARANCE: BoardAppearance = {
  background: '#101018',
  surface: '#17171f',
  accent: '#9c6bff',
  text: '#eceef6',
  theme: 'dark',
};
