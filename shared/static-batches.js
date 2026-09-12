import { finishConstruction } from './scene-construction.js'

/** Merge opaque decorative leaves by material and spatial cell; retain colliders and movable subtrees. */
export function batchStaticDecorations(scene, Mesh, excluded = new Set(), cellSize = 12) {
  finishConstruction(staticDecorationSteps(scene, Mesh, excluded, cellSize))
}

/** Incremental counterpart: classify leaves and merge one spatial/material group per step. */
export function* staticDecorationSteps(scene, Mesh, excluded = new Set(), cellSize = 12) {
  const batches = new Map()
  for (const mesh of [...scene.meshes]) {
    yield
    if (!(mesh instanceof Mesh) || !mesh.material || mesh.material.alpha < 1 || mesh.physicsBody || mesh.metadata?.solid || mesh.getChildren().length) continue
    let blocked = false
    for (let node = mesh; node; node = node.parent) {
      if (excluded.has(node) || node.metadata?.dynamic) { blocked = true; break }
    }
    if (blocked) continue
    mesh.computeWorldMatrix(true)
    const p = mesh.getAbsolutePosition()
    const key = `${mesh.material.uniqueId}:${Math.floor(p.x / cellSize)}:${Math.floor(p.z / cellSize)}:${Boolean(mesh.metadata?.noShadow)}`
    const group = batches.get(key) ?? []
    group.push(mesh); batches.set(key, group)
  }
  for (const meshes of batches.values()) {
    yield
    if (meshes.length < 2) continue
    const noShadow = meshes[0].metadata?.noShadow
    const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false)
    if (merged) {
      merged.name = 'static decoration cell'
      merged.metadata = { noShadow }
      merged.isPickable = false
      merged.receiveShadows = true
      merged.freezeWorldMatrix()
    }
  }
}
