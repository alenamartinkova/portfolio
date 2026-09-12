import type { TextKey } from '../i18n';

export const paints: readonly { color: string; name: TextKey }[] = [
  { color: '#efbd42', name: 'paintGold' },
  { color: '#49b9a5', name: 'paintMint' },
  { color: '#dc674d', name: 'paintCoral' },
  { color: '#6699de', name: 'paintBlue' },
  { color: '#a68aca', name: 'paintLilac' },
  { color: '#dce4dc', name: 'paintIvory' },
];
export const rimColors = ['#829396', '#dab567', '#293943'] as const;
export interface TruckStyle { paint: string; rims: string; stripes: boolean; kit: 'standard' | 'utility' }
export const defaultStyle: TruckStyle = { paint: paints[0].color, rims: rimColors[0], stripes: true, kit: 'standard' };
const key = 'forklift:truck-style:v1';
export function normalizeStyle(value: unknown): TruckStyle {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<TruckStyle>;
  return {
    paint: paints.some(p => p.color === v.paint) ? v.paint! : defaultStyle.paint,
    rims: rimColors.some(c => c === v.rims) ? v.rims! : defaultStyle.rims,
    stripes: typeof v.stripes === 'boolean' ? v.stripes : defaultStyle.stripes,
    kit: v.kit === 'utility' ? 'utility' : 'standard',
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
