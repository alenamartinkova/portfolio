import { CanvasTexture, Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Terrain } from '../core/board';
import { localize } from '../i18n';
import type { BoardAppearance } from './appearance';

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
const PLAYER_GLYPHS = ['✦', '◆', '●', '≋'] as const;
export interface CanvasTextureCache {
  texture(
    key: string,
    width: number,
    height: number,
    draw: (context: CanvasRenderingContext2D) => void,
  ): CanvasTexture;
  dispose(): void;
}

export function createCanvasTextureCache(): CanvasTextureCache {
  const textures = new Map<string, CanvasTexture>();
  return {
    texture: (key, width, height, draw) => {
      const cached = textures.get(key);
      if (cached) return cached;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context)
        throw new Error(
          localize('Canvas drawing is unavailable.', 'Kreslenie na plátno nie je dostupné.'),
        );
      draw(context);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      textures.set(key, texture);
      return texture;
    },
    dispose: () => {
      for (const texture of textures.values()) texture.dispose();
      textures.clear();
    },
  };
}

const textureCache = createCanvasTextureCache();
let owners = 0;
export function retainTextures() {
  owners++;
  let released = false;
  return () => { if (!released) { released = true; if (--owners === 0) textureCache.dispose(); } };
}

export function canvasTexture(
  key: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  return textureCache.texture(key, width, height, draw);
}
function randomSequence(seed: number): () => number {
  let cursor = seed;
  return () => {
    cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
    return cursor / 4294967296;
  };
}
export function paintTexture(): CanvasTexture {
  return canvasTexture('paint-grain', 128, 128, context => {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 128, 128);
    const random = randomSequence(349);
    context.fillStyle = 'rgba(18,18,26,.025)';
    for (let i = 0; i < 780; i++) context.fillRect(random() * 128, random() * 128, 1 + random() * 4, 1);
  });
}
export function matte(color: string): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, map: paintTexture(), roughness: .96, metalness: 0 });
}
export function solid(color: string): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: new Color(color), roughness: 0.95, metalness: 0 });
}
export function glyphTexture(player: number): CanvasTexture {
  return canvasTexture(`glyph-${player}`, 128, 128, (context) => {
    context.fillStyle = '#f1f1fa';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '700 100px "JetBrains Mono", monospace';
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

/** A quiet one-unit grid ties the tabletop to the portfolio's engineering surfaces. */
export function gridTexture(appearance: BoardAppearance): CanvasTexture {
  const texture = canvasTexture(
    `surface-grid-${appearance.theme}-${appearance.background}-${appearance.text}-${appearance.accent}`,
    512,
    512,
    (context) => {
      context.fillStyle = appearance.background;
      context.fillRect(0, 0, 512, 512);
      context.strokeStyle = appearance.text;
      context.lineWidth = 1;
      context.globalAlpha = appearance.theme === 'dark' ? 0.035 : 0.065;
      context.beginPath();
      for (let line = 0; line <= 512; line += 64) {
        context.moveTo(line + 0.5, 0);
        context.lineTo(line + 0.5, 512);
        context.moveTo(0, line + 0.5);
        context.lineTo(512, line + 0.5);
      }
      context.stroke();
      context.globalAlpha = appearance.theme === 'dark' ? 0.08 : 0.1;
      context.fillStyle = appearance.accent;
      for (let x = 0; x < 512; x += 128)
        for (let y = 0; y < 512; y += 128) context.fillRect(x - 1, y - 1, 3, 3);
      context.globalAlpha = 1;
    },
  );
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(5, 4.5);
  return texture;
}
