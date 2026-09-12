import type { TextKey } from '../i18n';

export const paints: readonly { color: string; name: TextKey }[] = [
  { color: '#efbd42', name: 'paintGold' },
  { color: '#49b9a5', name: 'paintMint' },
  { color: '#dc674d', name: 'paintCoral' },
  { color: '#6699de', name: 'paintBlue' },
  { color: '#a68aca', name: 'paintLilac' },
  { color: '#dce4dc', name: 'paintIvory' },
  { color: '#df772b', name: 'paintOrange' },
  { color: '#ad3436', name: 'paintRed' },
  { color: '#3e6856', name: 'paintForest' },
  { color: '#334c71', name: 'paintNavy' },
  { color: '#474c51', name: 'paintGraphite' },
  { color: '#c5ae84', name: 'paintSand' },
];
export const rimColors = ['#829396', '#dab567', '#293943'] as const;
export const finishes = [
  { value: 'gloss', name: 'finishGloss' }, { value: 'satin', name: 'finishSatin' }, { value: 'matte', name: 'finishMatte' },
] as const;
export const frameColors = [
  { value: '#30363b', name: 'frameGraphite' }, { value: '#bcc5c9', name: 'frameSilver' }, { value: '#263d4b', name: 'frameNavy' },
] as const;
export const seatColors = [
  { value: '#303336', name: 'seatCharcoal' }, { value: '#85583b', name: 'seatSaddle' }, { value: '#656d5b', name: 'seatOlive' },
] as const;
export const roofs = [{ value: 'open', name: 'roofOpen' }, { value: 'canopy', name: 'roofCanopy' }] as const;
export interface TruckStyle {
  paint: string; rims: string; stripes: boolean; kit: 'standard' | 'utility';
  finish: 'gloss' | 'satin' | 'matte'; frame: string; seat: string; roof: 'open' | 'canopy';
}
export const defaultStyle: TruckStyle = { paint: paints[0].color, rims: rimColors[0], stripes: true, kit: 'standard', finish: 'gloss', frame: frameColors[0].value, seat: seatColors[0].value, roof: 'open' };
const key = 'forklift:truck-style:v1';
export function normalizeStyle(value: unknown): TruckStyle {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<TruckStyle>;
  return {
    paint: paints.some(p => p.color === v.paint) ? v.paint! : defaultStyle.paint,
    rims: rimColors.some(c => c === v.rims) ? v.rims! : defaultStyle.rims,
    stripes: typeof v.stripes === 'boolean' ? v.stripes : defaultStyle.stripes,
    kit: v.kit === 'utility' ? 'utility' : 'standard',
    finish: finishes.some(f => f.value === v.finish) ? v.finish! : defaultStyle.finish,
    frame: frameColors.some(c => c.value === v.frame) ? v.frame! : defaultStyle.frame,
    seat: seatColors.some(c => c.value === v.seat) ? v.seat! : defaultStyle.seat,
    roof: v.roof === 'canopy' ? 'canopy' : 'open',
  };
}
export function readStyle(): TruckStyle {
  try { return normalizeStyle(JSON.parse(localStorage.getItem(key) ?? 'null')); }
  catch { return { ...defaultStyle }; }
}
export function saveStyle(style: TruckStyle) {
  try { localStorage.setItem(key, JSON.stringify(normalizeStyle(style))); }
  catch { /* The active truck retains the selection when storage is blocked. */ }
}
