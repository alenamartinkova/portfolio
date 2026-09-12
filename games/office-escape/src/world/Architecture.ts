import { t } from '../i18n';
import { Factory } from './Factory';
import type { OfficeLevel } from './levels';
import type { PhysicsInteractionSystem } from '../systems/PhysicsInteractionSystem';

/** Open-front architecture keeps the route readable with the orbit camera. */
export function buildArchitecture(f: Factory, physics: PhysicsInteractionSystem, level: OfficeLevel) {
  const stops = [...level.route, { ...level.exit, w: 5, d: 4 }];
  const left = Math.min(...stops.map(s => s.x - s.w / 2)) - 4;
  const right = Math.max(...stops.map(s => s.x + s.w / 2)) + 4;
  const front = Math.min(...stops.map(s => s.z - s.d / 2)) - 4;
  const back = Math.max(...stops.map(s => s.z + s.d / 2)) + 4;
  const height = Math.max(...stops.map(s => s.y)) + 5;
  const cx = (left + right) / 2, cz = (front + back) / 2, width = right - left, depth = back - front;
  const theme = level.architecture;
  const industrial = ['shaft', 'depot', 'servers', 'lockdown', 'finale'].includes(theme);
  const dark = ['servers', 'rooftop', 'lockdown'].includes(theme);
  const trim = theme === 'lockdown' ? '#f0a276' : industrial ? '#7cbac2' : '#e0cba0';
  const frame = industrial ? '#344b59' : '#718a85';
  const solid = (name: string, size: number[], pos: number[], color: string, forbidden = false) => {
    const mesh = f.box(name, size, pos, color);
    physics.rigid(mesh);
    if (forbidden) mesh.metadata.forbidden = true;
    return mesh;
  };
  const light = (size: number[], pos: number[]) => {
    const mesh = f.box('architectural light', size, pos, trim);
    mesh.material = f.mat(trim, true);
  };
  solid('forbidden ground floor', [width, .4, depth], [cx, -.2, cz], level.floor, true);
  for (let z = front; z < back; z += 3)
    f.box('floor grid', [width, .012, .025], [cx, .01, z], frame);
  for (let x = left; x < right; x += 3)
    f.box('floor grid', [.025, .012, depth], [x, .01, cz], frame);

  if (theme !== 'rooftop') {
    // Back wall and perimeter columns give scale without a ceiling over jumps.
    solid('building rear wall', [width, height, .3], [cx, height / 2, back], dark ? '#253848' : '#738b8c');
    for (const x of [left, right]) {
      for (let z = front; z <= back; z += 5) {
        f.box('structural column', [.22, height, .22], [x, height / 2, z], frame);
        if (['lobby', 'atrium'].includes(theme)) {
          const pane = f.box('exterior glass', [.05, height - 1, 4.7], [x, height / 2, z + 2.4], '#b6d7d7');
          pane.material = f.mat('#b6d7d7');
          pane.material.alpha = .12;
        }
      }
    }
  }

  if (theme === 'shaft' || theme === 'finale') {
    const shaftX = theme === 'shaft' ? 1.8 : 4.8;
    const shaftZ = theme === 'shaft' ? 4.6 : 11.2;
    // A central lift car, cables and guides; the playable ledges wrap around it.
    solid('lift car', [1.6, 2.2, 1.6], [shaftX, 1.1, shaftZ], '#566e79');
    for (const x of [shaftX - .65, shaftX + .65])
      f.cylinder('lift cable', .07, height, [x, height / 2, shaftZ], '#293d4c');
    for (const x of [left + .4, right - .4])
      f.box('lift guide rail', [.18, height, .3], [x, height / 2, cz], trim);
    for (let y = 0; y < height; y += 3.6) {
      f.box('shaft crossbeam', [width, .22, .4], [cx, y, back - .3], frame);
      f.label(`${String(Math.round(y / 3.6)).padStart(2, '0')} ↑`, 2, .8, [right - 2, y + 1.8, back - .2], trim, '#344b59');
      light([width, .06, .08], [cx, y + .3, back - .55]);
    }
  }
  if (theme === 'atrium' || theme === 'lobby') {
    const storeys = theme === 'atrium' ? [0, 5.4, 10.8, 16.2] : [0, 3.3];
    for (const y of storeys) {
      for (const x of [left + 1.2, right - 1.2]) {
        solid('forbidden balcony floor', [2.4, .25, depth], [x, y - .125, cz], '#c6c3ad', true);
        f.box('balcony handrail', [.08, .08, depth], [x + (x < cx ? 1.1 : -1.1), y + 1.05, cz], trim);
        for (let z = front; z < back; z += 3) {
          f.box('balcony baluster', [.06, 1.05, .06], [x + (x < cx ? 1.1 : -1.1), y + .525, z], frame);
          f.box('perimeter workstation', [1.3, .15, 1.8], [x, y + 1.3, z], '#d7bd91');
          f.box('perimeter monitor', [.1, .55, .8], [x, y + 1.65, z], '#344b59');
        }
        light([.08, .08, depth], [x, y + .2, cz]);
      }
    }
    if (theme === 'lobby') {
      f.cylinder('reception island', 3, 1, [2, .5, 5], '#73948a');
      f.cylinder('indoor tree trunk', .22, 4, [2, 2, 5], '#816c50');
      f.cylinder('sculpted tree canopy', 2.6, 1.3, [2, 4, 5], '#739c79');
      f.label(() => t('receptionArea').toUpperCase(), 5, .8, [cx, 4, back - .25], '#efe5cf', frame);
    }
  }
  if (['depot', 'archive', 'servers', 'lockdown'].includes(theme)) {
    for (const x of [left + 1.2, right - 1.2]) {
      for (let z = front + 2; z < back - 1; z += 3.5) {
        const rackHeight = theme === 'archive' ? 7 : theme === 'servers' ? 4.8 : 3.4;
        solid('perimeter storage rack', [1.8, rackHeight, 2.6], [x, rackHeight / 2, z], frame);
        for (let y = .6; y < rackHeight; y += .8) {
          f.box('storage shelf', [1.9, .07, 2.7], [x, y, z], trim);
          for (let j = 0; j < 3; j++) {
            f.box(theme === 'servers' ? 'server module' : 'archive carton', [.45, .5, .9], [x - .55 + j * .55, y + .28, z - .85], theme === 'servers' ? '#24323e' : '#bba27b');
            if (theme === 'servers') light([.08, .04, .04], [x - .55 + j * .55, y + .35, z - 1.32]);
          }
        }
      }
    }
    for (let z = front + 2; z < back; z += 6) {
      f.box('overhead service tray', [width, .15, .45], [cx, height - 1, z], frame);
      light([width - 2, .04, .12], [cx, height - 1.12, z]);
    }
    if (theme === 'depot') {
      for (const x of [0, 7.2, 14.4]) {
        f.box('dispatch lane', [2, .02, depth - 2], [x, .025, cz], '#b59b61');
        for (let z = front + 2; z < back; z += 4)
          f.label('↑', .7, .8, [x, .05, z], '#ead6a5', '#596f7a', true);
      }
    }
  }
  if (theme === 'rooftop') {
    for (const x of [left + 2, right - 2]) {
      const tower = solid('roof service tower', [3, 16, depth], [x, 8, cz], '#435a70');
      tower.receiveShadows = true;
      for (let y = 2; y < 17; y += 3)
        for (let z = front + 2; z < back; z += 4)
          light([3.02, .2, 1.5], [x, y, z]);
      f.cylinder('roof extraction fan', 2, .5, [x, 16.25, cz], '#8098a8');
    }
    for (let i = 0; i < 18; i++) {
      const x = i % 2 ? left - 7 : right + 7, z = front + Math.floor(i / 2) * 5;
      const h = 4 + i % 7;
      f.box('night skyline', [4, h, 4], [x, h / 2 - 2, z], '#263b55');
      for (let y = 0; y < h; y += 1.5) light([4.02, .2, 2], [x, y - 1, z]);
    }
  }
  level.route.filter(s => s.checkpoint !== undefined).forEach((s, i) => {
    f.label(() => `0${i + 1} · ${t(level.areas[i]).toUpperCase()}`, 3.6, .45,
      [s.x, s.y + 2.6, s.z + 1.6], '#f0ead6', frame);
  });
}
