import { expect, it, vi } from 'vitest';
import { NullEngine, Scene, StandardMaterial } from '@babylonjs/core';
import { Factory } from '../src/world/Factory';
import { getLocale, setLocale } from '../src/i18n';

it('shares immutable labels without conflating styling or independently translated callbacks', () => {
  const engine = new NullEngine(), scene = new Scene(engine), drawn: string[] = [];
  const canvas = vi.spyOn(engine, 'createCanvas').mockImplementation(() => ({
    width: 1, height: 1, remove() {},
    getContext: () => ({ fillRect() {}, fillText: (text: string) => drawn.push(text) }),
  }) as unknown as ReturnType<NullEngine['createCanvas']>);
  const f = new Factory(scene);
  try {
    setLocale('en');
    const a = f.label('ARROWS', 1, .5, [0, 0, 0]);
    const b = f.label('ARROWS', 1, .5, [2, 0, 0]);
    expect(a).not.toBe(b);
    expect(a.material).toBe(b.material);
    expect(drawn).toEqual(['ARROWS']);
    expect(f.label('ARROWS', 2, .5, [0, 0, 0]).material).not.toBe(a.material);
    expect(f.label('ARROWS', 1, .5, [0, 0, 0], '#ff0000').material).not.toBe(a.material);
    expect(f.label('ARROWS', 1, .5, [0, 0, 0], '#ffffff', '#000000').material).not.toBe(a.material);
    const c = f.label(() => getLocale() === 'en' ? 'SAME' : 'PRVÝ', 1, .5, [0, 0, 0]);
    const d = f.label(() => getLocale() === 'en' ? 'SAME' : 'DRUHÝ', 1, .5, [0, 0, 0]);
    expect(c.material).not.toBe(d.material);
    drawn.length = 0;
    setLocale('sk');
    expect(drawn).toEqual(['PRVÝ', 'DRUHÝ']);
    const texture = (a.material as StandardMaterial).diffuseTexture!;
    expect(scene.textures).toContain(texture);
    scene.dispose();
    const drawsAtDisposal = drawn.length;
    setLocale('en');
    expect(drawn).toHaveLength(drawsAtDisposal);
    expect(scene.textures).toHaveLength(0);
    expect(scene.materials).toHaveLength(0);
  } finally { scene.dispose(); canvas.mockRestore(); engine.dispose(); setLocale('en'); }
});
