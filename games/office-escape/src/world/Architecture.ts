import { t } from '../i18n';
import { Factory } from './Factory';
import type { OfficeLevel } from './levels';
import type { PhysicsInteractionSystem } from '../systems/PhysicsInteractionSystem';

/** Open-front architecture keeps the route readable with the orbit camera. */
export function* buildArchitecture(f: Factory, physics: PhysicsInteractionSystem, level: OfficeLevel) {
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
  yield;
  const light = (size: number[], pos: number[]) => {
    const mesh = f.box('architectural light', size, pos, trim);
    mesh.material = f.mat(trim, true);
  };
  yield;
  solid('forbidden ground floor', [width, .4, depth], [cx, -.2, cz], level.floor, true);
  yield;
  for (let z = front; z < back; z += 3) { yield; f.box('floor grid', [width, .006, .008], [cx, .01, z], frame); }
  for (let x = left; x < right; x += 3) { yield; f.box('floor grid', [.008, .006, depth], [x, .01, cz], frame); }

  if (theme !== 'rooftop') {
    // Back wall and perimeter columns give scale without a ceiling over jumps.
    solid('building rear wall', [width, height, .3], [cx, height / 2, back], dark ? '#253848' : '#738b8c');
    yield;
    f.box('wall skirting', [width, .16, .08], [cx, .1, back - .2], frame);
    yield;
    for (let x = left + 1.5; x < right; x += 3) {
      f.box('wall inset panel', [2.85, height - .5, .04], [x, height / 2, back - .18], dark ? '#2b3e4c' : '#91a09a');
      yield;
      f.box('wall vertical trim', [.035, height, .08], [x - 1.46, height / 2, back - .23], frame);
      yield;
    }

    for (const x of [left, right]) {
      for (let z = front; z <= back; z += 5) {
        f.box('structural column', [.22, height, .22], [x, height / 2, z], frame);
        yield;
        if (['lobby', 'atrium'].includes(theme)) {
          const pane = f.box('exterior glass', [.05, height - 1, 4.7], [x, height / 2, z + 2.4], '#b6d7d7');
          yield;
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
    yield;
    for (const x of [shaftX - .65, shaftX + .65]) { yield; f.cylinder('lift cable', .07, height, [x, height / 2, shaftZ], '#293d4c'); }
    for (const x of [left + .4, right - .4]) { yield; f.box('lift guide rail', [.18, height, .3], [x, height / 2, cz], trim); }
    for (let y = 0; y < height; y += 3.6) {
      f.box('shaft crossbeam', [width, .22, .4], [cx, y, back - .3], frame);
      yield;
      f.label(`${String(Math.round(y / 3.6)).padStart(2, '0')} ↑`, 2, .8, [right - 2, y + 1.8, back - .2], trim, '#344b59');
      yield;
      light([width, .06, .08], [cx, y + .3, back - .55]);
    }
  }
  if (theme === 'atrium' || theme === 'lobby') {
    const storeys = theme === 'atrium' ? [0, 5.4, 10.8, 16.2] : [0, 3.3];
    for (const y of storeys) {
      for (const x of [left + 1.2, right - 1.2]) {
        solid('forbidden balcony floor', [2.4, .25, depth], [x, y - .125, cz], '#c6c3ad', true);
        yield;
        f.box('balcony handrail', [.08, .08, depth], [x + (x < cx ? 1.1 : -1.1), y + 1.05, cz], trim);
        yield;
        for (let z = front; z < back; z += 3) {
          f.box('balcony baluster', [.06, 1.05, .06], [x + (x < cx ? 1.1 : -1.1), y + .525, z], frame);
          yield;
          f.box('balcony glass panel', [.025, .78, 2.85], [x + (x < cx ? 1.1 : -1.1), y + .54, z + 1.5], '#b4c8c1');
          yield;

          f.box('perimeter workstation', [1.3, .15, 1.8], [x, y + 1.3, z], '#d7bd91');
          yield;
          f.box('perimeter monitor', [.1, .55, .8], [x, y + 1.65, z], '#344b59');
          yield;
        }
        light([.08, .08, depth], [x, y + .2, cz]);
      }
    }
    if (theme === 'lobby') {
      f.cylinder('reception island', 3, 1, [2, .5, 5], '#73948a');
      yield;
      f.cylinder('indoor tree trunk', .22, 4, [2, 2, 5], '#816c50');
      yield;
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
        f.tube('indoor tree branch', [[2, 2.7, 5], [2 + Math.sin(a) * .5, 3.5, 5 + Math.cos(a) * .5], [2 + Math.sin(a), 3.8 + i % 2 * .4, 5 + Math.cos(a)]], .045, '#816c50');
        yield;
        f.sphere('tree foliage', [1.1, .9, 1.1], [2 + Math.sin(a) * .9, 3.9 + i % 2 * .4, 5 + Math.cos(a) * .9], i % 2 ? '#618261' : '#73946b');
        yield;
      }

      f.label(() => t('receptionArea').toUpperCase(), 5, .8, [cx, 4, back - .25], '#efe5cf', frame);
      yield;
    }
  }
  if (['depot', 'archive', 'servers', 'lockdown'].includes(theme)) {
    for (const x of [left + 1.2, right - 1.2]) {
      for (let z = front + 2; z < back - 1; z += 3.5) {
        const rackHeight = theme === 'archive' ? 7 : theme === 'servers' ? 4.8 : 3.4;
        solid('perimeter storage rack', [1.8, rackHeight, 2.6], [x, rackHeight / 2, z], frame);
        yield;
        for (const side of [-1, 1]) {
          f.box('rack metal frame', [.065, rackHeight, .08], [x + side * .85, rackHeight / 2, z - 1.34], '#758d8d');
          yield;
          f.box('rack metal foot', [.3, .07, .35], [x + side * .85, .04, z - 1.2], '#344752');
          yield;
        }

        for (let y = .6; y < rackHeight; y += .8) {
          f.box('storage shelf', [1.9, .07, 2.7], [x, y, z], trim);
          yield;
          for (let j = 0; j < 3; j++) {
            f.box(theme === 'servers' ? 'server module' : 'archive carton', [.45, .5, .9], [x - .55 + j * .55, y + .28, z - .85], theme === 'servers' ? '#24323e' : '#bba27b');
            yield;
            if (theme === 'servers') {
              light([.08, .025, .035], [x - .55 + j * .55, y + .35, z - 1.32]);
              for (let slot = 0; slot < 4; slot++) { yield; f.box('server ventilation slot', [.32, .018, .016], [x - .55 + j * .55, y + .12 + slot * .042, z - 1.31], '#657d83'); }
            } else {
              f.box('carton tape', [.075, .012, .9], [x - .55 + j * .55, y + .536, z - .85], '#d7c6a0');
              yield;
              f.box('archive index label', [.22, .12, .014], [x - .55 + j * .55, y + .29, z - 1.31], '#e9e2ce');
              yield;
            }
          }
        }
      }
    }
    for (let z = front + 2; z < back; z += 6) {
      f.box('overhead service tray', [width, .15, .45], [cx, height - 1, z], frame);
      yield;
      light([width - 2, .04, .12], [cx, height - 1.12, z]);
    }
    if (theme === 'depot') {
      for (const x of [0, 7.2, 14.4]) {
        f.box('dispatch lane', [2, .02, depth - 2], [x, .025, cz], '#b59b61');
        yield;
        for (let z = front + 2; z < back; z += 4) { yield; f.label('↑', .7, .8, [x, .05, z], '#ead6a5', '#596f7a', true); }
      }
    }
  }
  if (theme === 'rooftop') {
    for (const x of [left + 2, right - 2]) {
      const tower = solid('roof service tower', [3, 16, depth], [x, 8, cz], '#435a70');
      yield;
      tower.receiveShadows = true;
      for (let y = 2; y < 17; y += 3) {
        yield; for (let z = front + 2; z < back; z += 4) { yield; light([3.02, .2, 1.5], [x, y, z]); }
      }
      f.cylinder('roof extraction fan', 2, .5, [x, 16.25, cz], '#8098a8');
      yield;
      f.cylinder('fan inner recess', 1.7, .012, [x, 16.51, cz], '#2e424e');
      yield;
      f.cylinder('fan metal hub', .3, .1, [x, 16.56, cz], '#97aaa9');
      yield;
      for (let blade = 0; blade < 6; blade++) {
        const a = blade * Math.PI / 3;
        const mesh = f.sphere('fan metal blade', [.28, .04, .75], [x + Math.sin(a) * .4, 16.535, cz + Math.cos(a) * .4], '#7b9296');
        yield;
        mesh.rotation.y = a + .35;
      }

    }
    for (let i = 0; i < 18; i++) {
      const x = i % 2 ? left - 7 : right + 7, z = front + Math.floor(i / 2) * 5;
      const h = 4 + i % 7;
      f.box('night skyline', [4, h, 4], [x, h / 2 - 2, z], '#263b55');
      yield;
      for (let y = 0; y < h; y += 1.5) { yield; light([4.02, .2, 2], [x, y - 1, z]); }
    }
  }
  for (const [i, s] of level.route.filter(s => s.checkpoint !== undefined).entries()) {
    f.label(() => `0${i + 1} · ${t(level.areas[i]).toUpperCase()}`, 3.6, .45,
      [s.x, s.y + 2.6, s.z + 1.6], '#f0ead6', frame);
    yield;
  }
}
