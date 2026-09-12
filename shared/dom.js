// HUDs are sampled every frame, but most displayed values rarely change.
export function setText(node, value) {
  if (node.textContent !== value) node.textContent = value
}

// Only use with application-owned markup, never untrusted input.
export function setHTML(node, value) {
  if (node.innerHTML !== value) node.innerHTML = value
}

// Reassigning an unchanged style/data attribute still triggers mutation observers
// and style invalidation. Animation values often stay clamped at 0 or 1.
export function setStyle(element, property, value) {
  const next = String(value)
  if (element.style.getPropertyValue(property) !== next)
    element.style.setProperty(property, next)
}

export function setData(element, property, value) {
  const next = String(value)
  if (element.dataset[property] !== next) element.dataset[property] = next
}
