// HUDs are sampled every frame, but most displayed values rarely change.
export function setText(node, value) {
  if (node.textContent !== value) node.textContent = value
}
