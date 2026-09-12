let pending
export function loadStudio() {
  return pending ??= import('./scene/createStudio.js').catch(error => { pending = undefined; throw error })
}
