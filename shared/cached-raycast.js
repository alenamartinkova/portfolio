/** Cache queries against static colliders until the camera ray changes. */
export function createCachedRaycast(pick) {
  let ox, oy, oz, dx, dy, dz, length, result
  return ray => {
    const o = ray.origin, d = ray.direction
    if (o.x !== ox || o.y !== oy || o.z !== oz || d.x !== dx || d.y !== dy || d.z !== dz || ray.length !== length) {
      ox = o.x; oy = o.y; oz = o.z; dx = d.x; dy = d.y; dz = d.z; length = ray.length
      result = pick(ray)
    }
    return result
  }
}
