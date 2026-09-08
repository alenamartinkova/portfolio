import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  Vector3,
} from 'three';
import type { PerspectiveCamera } from 'three';
import { RESOURCES } from '../core/state';
import type { GameState } from '../core/state';
import { TERRAIN_RESOURCE } from '../core/board';
import { RESOURCE_GLYPHS, canvasTexture, matte, solid } from './materials';
import type { BoardPositions } from './positions';
import { DEFAULT_APPEARANCE } from './appearance';
import type { BoardAppearance } from './appearance';

interface Particle {
  active: boolean;
  age: number;
  duration: number;
  start: Vector3;
  end: Vector3;
  color: Color;
}
export interface SceneFx {
  readonly group: Group;
  setAppearance(appearance: BoardAppearance): void;
  update(before: GameState | null, state: GameState, reduced: boolean, speed: number): void;
  tick(delta: number, time: number): boolean;
  cameraShake(time: number): number;
}
function diceGeometry(): BufferGeometry {
  const geometry = new BoxGeometry(0.44, 0.44, 0.44),
    uv = geometry.getAttribute('uv');
  const sides = [3, 4, 1, 6, 2, 5];
  for (let face = 0; face < 6; face++)
    for (let vertex = 0; vertex < 4; vertex++) {
      const index = face * 4 + vertex;
      uv.setXY(index, ((sides[face] ?? 1) - 1 + uv.getX(index)) / 6, uv.getY(index));
    }
  return geometry;
}
function diceAtlas() {
  return canvasTexture('dice-faces', 768, 128, (context) => {
    const coordinates: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
      1: [[0, 0]],
      2: [
        [-1, -1],
        [1, 1],
      ],
      3: [
        [-1, -1],
        [0, 0],
        [1, 1],
      ],
      4: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ],
      5: [
        [-1, -1],
        [-1, 1],
        [0, 0],
        [1, -1],
        [1, 1],
      ],
      6: [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ],
    };
    for (let number = 1; number <= 6; number++) {
      const x = (number - 1) * 128;
      context.fillStyle = '#e2e5ef';
      context.fillRect(x, 0, 128, 128);
      context.strokeStyle = '#b7bbcd';
      context.lineWidth = 7;
      context.strokeRect(x + 4, 4, 120, 120);
      context.fillStyle = '#242432';
      for (const [dx, dy] of coordinates[number] ?? []) {
        context.beginPath();
        context.arc(x + 64 + dx * 30, 64 + dy * 30, 10, 0, Math.PI * 2);
        context.fill();
      }
    }
  });
}
export function createFx(positions: BoardPositions, camera: PerspectiveCamera): SceneFx {
  const group = new Group(),
    dummy = new Object3D();
  const diceTray = new Group();
  group.add(diceTray);
  diceTray.position.set(5.15, -0.25, 4.4);
  const material = matte('#e2e5ef');
  material.map = diceAtlas();
  const dice = [new Mesh(diceGeometry(), material), new Mesh(diceGeometry(), material)];
  const finals = [new Vector3(), new Vector3()];
  dice.forEach((die, index) => {
    die.castShadow = true;
    die.receiveShadow = true;
    die.position.set(index === 0 ? -0.33 : 0.33, 0.27, 0);
    diceTray.add(die);
  });
  const tray = new Mesh(new BoxGeometry(1.4, 0.11, 0.73), solid('#353543'));
  tray.position.set(0, -0.02, 0);
  tray.receiveShadow = true;
  diceTray.add(tray);
  const inset = new Mesh(new BoxGeometry(1.23, 0.015, 0.6), solid(DEFAULT_APPEARANCE.surface));
  inset.position.set(0, 0.043, 0);
  diceTray.add(inset);
  const pulseMaterial = new MeshBasicMaterial({
    color: DEFAULT_APPEARANCE.accent,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const pulses = new InstancedMesh(
    new RingGeometry(0.74, 0.84, 6).rotateX(-Math.PI / 2),
    pulseMaterial,
    19,
  );
  pulses.count = 0;
  pulses.frustumCulled = false;
  group.add(pulses);
  const resourceTexture = canvasTexture('resource-flight', 320, 64, (context) => {
    ['lumber', 'grain', 'wool', 'brick', 'ore'].forEach((r, index) => {
      context.fillStyle = '#f0eff8';
      context.font = '700 45px "JetBrains Mono", monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(RESOURCE_GLYPHS[r] ?? '◆', index * 64 + 32, 32);
    });
  });
  const particles = new InstancedMesh(
    new PlaneGeometry(0.17, 0.17),
    new MeshBasicMaterial({ map: resourceTexture, transparent: true, depthWrite: false }),
    40,
  );
  const resourceIndices = new InstancedBufferAttribute(new Float32Array(40), 1);
  particles.geometry.setAttribute('resourceIndex', resourceIndices);
  particles.material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute float resourceIndex;\n${shader.vertexShader}`.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\nvMapUv.x = (vMapUv.x + resourceIndex) / 5.0;',
    );
  };
  particles.count = 40;
  particles.frustumCulled = false;
  group.add(particles);
  const flightColor = new Color(DEFAULT_APPEARANCE.accent);
  const flights: Particle[] = Array.from({ length: 40 }, () => ({
    active: false,
    age: 0,
    duration: 1,
    start: new Vector3(),
    end: new Vector3(),
    color: new Color(),
  }));
  for (let i = 0; i < 40; i++) {
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    particles.setMatrixAt(i, dummy.matrix);
    const flight = flights[i];
    if (flight) particles.setColorAt(i, flight.color);
  }
  let diceElapsed = 1,
    diceDuration = 1,
    pulseElapsed = 10,
    pulseDuration = 1,
    shakeUntil = 0,
    lastTime = 0;
  function setDice(result: readonly [number, number], reduced: boolean, speed: number): void {
    diceElapsed = 0;
    diceDuration = reduced ? 0.001 : 1.12 / speed;
    for (let index = 0; index < 2; index++) {
      const value = result[index] ?? 1,
        final = finals[index];
      if (!final) continue;
      final.set(
        value === 6 ? Math.PI : value === 2 ? -Math.PI / 2 : value === 5 ? Math.PI / 2 : 0,
        0,
        value === 3 ? Math.PI / 2 : value === 4 ? -Math.PI / 2 : 0,
      );
    }
    if (reduced) {
      diceElapsed = diceDuration;
      for (let index = 0; index < 2; index++) {
        const die = dice[index],
          final = finals[index];
        if (die && final) {
          die.rotation.set(final.x, final.y, final.z);
          die.position.set(index === 0 ? -0.33 : 0.33, 0.277, 0);
        }
      }
    }
    if (result[0] + result[1] === 7 && !reduced) shakeUntil = lastTime + 0.22 / speed;
  }
  function update(
    before: GameState | null,
    state: GameState,
    reduced: boolean,
    speed: number,
  ): void {
    if (state.dice && (!before || state.dice !== before.dice))
      setDice(state.dice, reduced || before === null, speed);
    const action = state.actions[state.actions.length - 1];
    if (!before || action?.type !== 'roll' || !state.dice) return;
    const total = state.dice[0] + state.dice[1];
    if (total === 7) return;
    let count = 0;
    for (const tile of state.board.tiles) {
      if (tile.number !== total || tile.id === state.bandit) continue;
      const p = positions.tiles.get(tile.id);
      if (!p) continue;
      dummy.position.set(p.x, 0.202, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      pulses.setMatrixAt(count++, dummy.matrix);
    }
    pulses.count = count;
    pulses.instanceMatrix.needsUpdate = true;
    pulseElapsed = 0;
    pulseDuration = reduced ? 0.001 : 1.6 / speed;
    for (const person of state.players) {
      const old = before.players[person.id];
      if (!old) continue;
      const remaining = { ...person.hand };
      for (const resource of RESOURCES)
        remaining[resource] = Math.max(0, person.hand[resource] - old.hand[resource]);
      const buildings = Object.entries(state.buildings).filter(
        ([, building]) => building.owner === person.id,
      );
      for (const [id, building] of buildings) {
        const from = positions.vertices.get(id);
        const vertex = state.board.vertices.find((candidate) => candidate.id === id);
        if (!from || !vertex) continue;
        for (const hex of vertex.hexes) {
          const tile = state.board.tiles.find((candidate) => candidate.id === hex);
          if (!tile || tile.number !== total || tile.id === state.bandit) continue;
          const resource = TERRAIN_RESOURCE[tile.terrain];
          if (!resource || remaining[resource] === 0) continue;
          const produced = Math.min(remaining[resource], building.kind === 'town' ? 2 : 1);
          for (let card = 0; card < produced; card++) {
            const flight = flights.find((candidate) => !candidate.active);
            if (!flight) break;
            remaining[resource]--;
            flight.active = true;
            flight.age = 0;
            flight.duration = reduced ? 0.001 : 1.3 / speed;
            flight.start.set(from.x + card * 0.08, 0.55, from.z);
            const angle = -Math.PI / 2 + (person.id * Math.PI) / 2;
            flight.end.set(Math.sin(angle) * 5.5, 0.3, Math.cos(angle) * 5.5);
            flight.color.copy(flightColor);
            resourceIndices.setX(flights.indexOf(flight), RESOURCES.indexOf(resource));
            resourceIndices.needsUpdate = true;
          }
        }
      }
    }
  }
  function tick(delta: number, time: number): boolean {
    // The dice rest on the table beyond the frame, clear of all nine harbours.
    diceTray.position.set(camera.aspect < 0.8 ? 0 : 5.15, -0.25, camera.aspect < 0.8 ? 6.55 : 4.4);
    lastTime = time;
    let active = false;
    if (diceElapsed < diceDuration) {
      active = true;
      diceElapsed = Math.min(diceDuration, diceElapsed + delta);
      const t = diceElapsed / diceDuration,
        eased = 1 - Math.pow(1 - t, 3);
      for (let index = 0; index < 2; index++) {
        const die = dice[index],
          final = finals[index];
        if (!die || !final) continue;
        die.rotation.set(
          final.x + (1 - eased) * Math.PI * 6,
          final.y + (1 - eased) * Math.PI * 4,
          final.z + (1 - eased) * Math.PI * 2,
        );
        die.position.y = 0.277 + Math.sin(t * Math.PI) * 0.9;
        die.position.x = (index === 0 ? -0.33 : 0.33) + (1 - eased) * (index === 0 ? -0.65 : 0.65);
      }
    }
    if (pulseElapsed < pulseDuration) {
      active = true;
      pulseElapsed += delta;
      pulseMaterial.opacity = Math.max(
        0,
        Math.sin(Math.min(1, pulseElapsed / pulseDuration) * Math.PI) * 0.55,
      );
    } else pulseMaterial.opacity = 0;
    let changed = false;
    for (let index = 0; index < flights.length; index++) {
      const flight = flights[index];
      if (!flight || !flight.active) continue;
      active = true;
      changed = true;
      flight.age += delta;
      const t = Math.min(1, flight.age / flight.duration);
      dummy.position.lerpVectors(flight.start, flight.end, t);
      dummy.position.y += Math.sin(t * Math.PI) * 1.7;
      dummy.quaternion.copy(camera.quaternion);
      dummy.scale.setScalar(t >= 1 ? 0 : 1);
      dummy.updateMatrix();
      particles.setMatrixAt(index, dummy.matrix);
      particles.setColorAt(index, flight.color);
      if (t >= 1) flight.active = false;
    }
    if (changed) {
      particles.instanceMatrix.needsUpdate = true;
      if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
    }
    return active;
  }
  return {
    group,
    update,
    tick,
    cameraShake: (time) => (time < shakeUntil ? Math.sin(time * 97) * 1.8 : 0),
    setAppearance: (appearance) => {
      tray.material.color.set(appearance.theme === 'dark' ? '#353543' : '#b8bac8');
      inset.material.color.set(appearance.surface);
      pulseMaterial.color.set(appearance.accent);
      flightColor.set(appearance.accent);
    },
  };
}
