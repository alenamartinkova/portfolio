import { CanvasTexture, Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Terrain } from '../core/board';

export const PALETTE: Readonly<Record<Terrain, string>> = {
  forest: '#2F6B4A',
  fields: '#D8A648',
  pasture: '#8DAE6E',
  hills: '#B4552F',
  mountains: '#6E7480',
  desert: '#E3D3A8',
};
export const PLAYER_COLORS = ['#2179b5', '#e5ad38', '#b64864', '#785fc1'] as const;
export const ACCESSIBLE_COLORS = ['#0072B2', '#E69F00', '#D55E00', '#CC79A7'] as const;
export const PLAYER_GLYPHS = ['✦', '◆', '●', '≋'] as const;
const textureCache = new Map<string, CanvasTexture>();

export function canvasTexture(
  key: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const cached = textureCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas drawing is unavailable.');
  draw(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}
function randomSequence(seed: number): () => number {
  let cursor = seed;
  return () => {
    cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
    return cursor / 4294967296;
  };
}
export function paintTexture(color: string, wood = false): CanvasTexture {
  return canvasTexture(`${wood ? 'wood' : 'paint'}-${color}`, 512, 512, (context) => {
    context.fillStyle = color;
    context.fillRect(0, 0, 512, 512);
    const random = randomSequence(wood ? 78 : 349);
    for (let index = 0; index < 12500; index++) {
      const light = random() > 0.5;
      context.fillStyle = light ? 'rgba(255,250,212,.055)' : 'rgba(18,16,12,.045)';
      const x = random() * 512;
      const y = random() * 512;
      context.fillRect(
        x,
        y,
        wood ? 18 + random() * 85 : 2 + random() * 18,
        wood ? 0.4 : 1 + random() * 2,
      );
    }
    if (wood) {
      context.lineWidth = 0.8;
      for (let line = 0; line < 90; line++) {
        context.strokeStyle = `rgba(12,9,6,${0.08 + random() * 0.12})`;
        context.beginPath();
        for (let x = 0; x <= 512; x += 8) {
          const y =
            line * 6 + Math.sin(x * 0.012 + line * 0.41) * 7 + Math.sin(x * 0.035 + line) * 1.6;
          if (x === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }
    }
  });
}
export function matte(color: string, wood = false): MeshStandardMaterial {
  const texture = paintTexture(color, wood);
  if (wood) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(2, 2);
  }
  return new MeshStandardMaterial({ color: 0xffffff, map: texture, roughness: 0.96, metalness: 0 });
}
export function solid(color: string): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: new Color(color), roughness: 0.95, metalness: 0 });
}
export function glyphTexture(player: number): CanvasTexture {
  return canvasTexture(`glyph-${player}`, 128, 128, (context) => {
    context.fillStyle = '#fff4cc';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '700 100px "Public Sans Variable", sans-serif';
    context.fillText(PLAYER_GLYPHS[player] ?? '✦', 64, 65);
  });
}
export const RESOURCE_GLYPHS: Readonly<Record<string, string>> = {
  lumber: '♠',
  grain: 'ϟ',
  wool: '●',
  brick: '▰',
  ore: '▲',
};
