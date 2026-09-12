/** Macrotask boundary without the nested setTimeout 4 ms clamp. */
export function yieldConstruction() {
  return new Promise(resolve => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      channel.port2.close()
      resolve(undefined)
    }
    channel.port2.postMessage(null)
  })
}

/** @param {() => boolean} isCancelled */
export function assertConstructionActive(isCancelled) {
  if (isCancelled()) throw new DOMException('Scene construction cancelled', 'AbortError')
}

/**
 * Builders yield between bounded pieces of work; only an exhausted time budget
 * schedules a browser task. No rendering or physics runs on the partial level.
 * @template T
 * @param {Generator<unknown, T, unknown>} steps
 * @param {{isCancelled?: () => boolean, budgetMs?: number, now?: () => number, yieldTask?: () => Promise<unknown>}} options
 */
export async function constructScene(steps, {
  isCancelled = () => false, budgetMs = 8,
  now = () => performance.now(), yieldTask = yieldConstruction,
} = {}) {
  let deadline = now() + budgetMs
  try {
    while (true) {
      assertConstructionActive(isCancelled)
      const result = steps.next()
      if (result.done) return result.value
      if (now() >= deadline) {
        await yieldTask()
        deadline = now() + budgetMs
      }
    }
  } finally {
    // Close nested generators on cancellation; their finally blocks still run.
    steps.return(/** @type {T} */ (undefined))
  }
}

/** Synchronous entry for physics tests/tools using the exact same builder.
 * @template T
 * @param {Generator<unknown, T, unknown>} steps
 */
export function finishConstruction(steps) {
  let result = steps.next()
  while (!result.done) result = steps.next()
  return result.value
}

/** Start Babylon material compilation in bounded groups before its final
 * scene-wide readiness check. A shader/driver call itself cannot be preempted.
 * This uses the camera's pass, as Scene.isReady does, and restores engine state
 * before every yield. It prepares resources without advancing physics/rendering.
 */
export function* prepareSceneMaterials(scene) {
  const engine = scene.getEngine()
  for (const mesh of [...scene.meshes]) {
    if (!mesh.subMeshes?.length) continue
    const previousPass = engine.currentRenderPassId
    try {
      engine.currentRenderPassId = scene.activeCamera?.renderPassId ?? previousPass
      mesh.isReady(true)
    } finally { engine.currentRenderPassId = previousPass }
    yield
  }
}
