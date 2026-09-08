import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  TYPES,
  COLOURS,
  footprint,
  supportSurface,
  brickKey,
} from '../models.js'

// This module owns only Three.js resources. React owns all surrounding UI.
export function createStudio(
  options,
  { Renderer = THREE.WebGLRenderer, Controls = OrbitControls } = {}
) {
  const mainEl = options.mainEl,
    referenceEl = options.referenceEl
  if (!mainEl || !referenceEl)
    throw new Error('The studio could not find its drawing surface.')
  const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0))
  const typeMap = new Map(TYPES.map(t => [t.id, t]))
  const colorMap = new Map(COLOURS.map(c => [c.id, c]))
  const geometryCache = new Map(),
    materialCache = new Map()
  const tempObject = new THREE.Object3D()
  const vector = new THREE.Vector3()
  let build = [],
    buildSurfaces = [],
    target = [],
    guides = [],
    hints = [],
    comparison = false
  let correct = new Set(),
    peel = 60,
    disposed = false,
    active = !document.hidden
  let pointer = null,
    hoverBrick = null,
    lastCandidate = null,
    pointerDown = null,
    lastGhostKey = ''
  let cameraTween = null,
    celebrationStart = 0,
    spinOffset = 0
  let lastTime = performance.now(),
    animationID = 0
  const scene = new THREE.Scene()
  const referenceScene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 300)
  const referenceCamera = new THREE.PerspectiveCamera(37, 1, 0.1, 300)
  const renderer = new Renderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0xf4f2ec, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  renderer.domElement.setAttribute('aria-label', options.labels.workspace)
  renderer.domElement.style.cssText =
    'display:block;width:100%;height:100%;touch-action:none;outline:none;'
  renderer.domElement.tabIndex = 0
  mainEl.prepend(renderer.domElement)
  let referenceRenderer
  try {
    referenceRenderer = new Renderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    })
  } catch (error) {
    renderer.dispose()
    renderer.domElement.remove()
    throw error
  }
  referenceRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  referenceRenderer.setClearColor(0xf0f0e7, 0)
  referenceRenderer.outputColorSpace = THREE.SRGBColorSpace
  referenceRenderer.toneMapping = THREE.ACESFilmicToneMapping
  referenceRenderer.toneMappingExposure = 1.05
  referenceRenderer.domElement.style.cssText =
    'display:block;width:100%;height:100%;touch-action:none;'
  referenceRenderer.domElement.setAttribute(
    'aria-label',
    options.labels.reference
  )
  referenceEl.append(referenceRenderer.domElement)
  const controls = new Controls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.09
  controls.minDistance = 10
  controls.maxDistance = 180
  controls.maxPolarAngle = Math.PI / 2 - 0.04
  controls.enablePan = false
  controls.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: THREE.MOUSE.ROTATE,
  }
  controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }
  const referenceControls = new Controls(
    referenceCamera,
    referenceRenderer.domElement
  )
  referenceControls.enableDamping = true
  referenceControls.dampingFactor = 0.1
  referenceControls.enablePan = false
  referenceControls.minDistance = 5
  referenceControls.maxDistance = 180
  referenceControls.maxPolarAngle = Math.PI / 2 - 0.03
  referenceControls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: THREE.MOUSE.ROTATE,
  }
  referenceControls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_ROTATE,
  }
  controls.addEventListener('start', () => {
    cameraTween = null
  })
  const plateGroup = new THREE.Group()
  const referencePlate = new THREE.Group()
  const buildGroup = new THREE.Group(),
    targetGroup = new THREE.Group()
  const guideGroup = new THREE.Group(),
    hintGroup = new THREE.Group(),
    ghostGroup = new THREE.Group()
  const celebrationGroup = new THREE.Group(),
    missingGroup = new THREE.Group()
  scene.add(
    plateGroup,
    buildGroup,
    guideGroup,
    hintGroup,
    ghostGroup,
    celebrationGroup,
    missingGroup
  )
  referenceScene.add(referencePlate, targetGroup)
  const baseResources = []
  function lightStudio(s, shadow) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xc4c9b4, 1.7)
    s.add(hemi)
    const sun = new THREE.DirectionalLight(0xffffff, 2.5)
    sun.position.set(-16, 32, 14)
    s.add(sun)
    if (shadow) {
      sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048)
      Object.assign(sun.shadow.camera, {
        left: -23,
        right: 23,
        top: 25,
        bottom: -23,
        near: 1,
        far: 90,
      })
      sun.shadow.normalBias = 0.035
      sun.shadow.bias = -0.0002
      sun.shadow.radius = 3
    }
    const fill = new THREE.DirectionalLight(0xf2f6ff, 0.7)
    fill.position.set(20, 13, -20)
    s.add(fill)
  }
  lightStudio(scene, true)
  lightStudio(referenceScene, false)
  function roundedBody(w, d, height) {
    const x = -w / 2 + 0.06,
      z = -d / 2 + 0.06,
      ww = w - 0.12,
      dd = d - 0.12,
      r = 0.035
    const shape = new THREE.Shape()
    shape.moveTo(x + r, z)
    shape.lineTo(x + ww - r, z)
    shape.quadraticCurveTo(x + ww, z, x + ww, z + r)
    shape.lineTo(x + ww, z + dd - r)
    shape.quadraticCurveTo(x + ww, z + dd, x + ww - r, z + dd)
    shape.lineTo(x + r, z + dd)
    shape.quadraticCurveTo(x, z + dd, x, z + dd - r)
    shape.lineTo(x, z + r)
    shape.quadraticCurveTo(x, z, x + r, z)
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.12, height - 0.11),
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      curveSegments: 2,
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0.055, 0)
    return g
  }
  function slopeBody(w, d, h) {
    const l = -w / 2 + 0.035,
      r = w / 2 - 0.035,
      f = -d / 2 + 0.035,
      back = d / 2 - 0.035
    const ridge = back - Math.min(0.97, d - 0.1),
      low = 0.055,
      high = h - 0.035,
      front = 0.16
    const vertices = [
      [l, low, f],
      [r, low, f],
      [l, front, f],
      [r, front, f],
      [l, high, ridge],
      [r, high, ridge],
      [l, high, back],
      [r, high, back],
      [l, low, back],
      [r, low, back],
    ]
    const faces = [
      0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 4, 5, 7, 4, 7, 6, 6, 7, 9, 6, 9, 8, 8,
      9, 1, 8, 1, 0, 0, 2, 4, 0, 4, 6, 0, 6, 8, 1, 9, 7, 1, 7, 5, 1, 5, 3,
    ]
    const g = new THREE.BufferGeometry()
    const pos = []
    for (let i = 0; i < faces.length; i += 3) {
      pos.push(
        ...vertices[faces[i]],
        ...vertices[faces[i + 2]],
        ...vertices[faces[i + 1]]
      )
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    g.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        new Float32Array((pos.length / 3) * 2),
        2
      )
    )
    return g
  }
  function geometry(typeID) {
    if (geometryCache.has(typeID)) return geometryCache.get(typeID)
    const t = typeMap.get(typeID)
    if (!t) throw new Error('Unknown brick type: ' + typeID)
    const w = t.w,
      d = t.d,
      h = t.h * 0.4,
      slope =
        String(t.kind).includes('slope') || String(t.id).includes('slope'),
      round = String(t.kind).includes('round') || String(t.id).includes('round')
    const pieces = []
    if (slope) pieces.push(slopeBody(w, d, h))
    else if (round) {
      const cylinder = new THREE.CylinderGeometry(0.465, 0.465, h - 0.065, 24)
      cylinder.translate(0, h / 2 + 0.005, 0)
      pieces.push(cylinder)
    } else pieces.push(roundedBody(w, d, h))
    for (let x = 0; x < w; x++)
      for (let z = 0; z < d; z++) {
        if (slope && z < d - 1) continue
        const stud = new THREE.CylinderGeometry(0.292, 0.3, 0.165, 16)
        stud.translate(x - (w - 1) / 2, h + 0.057, z - (d - 1) / 2)
        pieces.push(stud)
        const ring = new THREE.TorusGeometry(0.213, 0.012, 4, 16)
        ring.rotateX(Math.PI / 2)
        ring.translate(x - (w - 1) / 2, h + 0.145, z - (d - 1) / 2)
        pieces.push(ring)
      }
    const nonIndexed = pieces.map(p => (p.index ? p.toNonIndexed() : p))
    const merged = mergeGeometries(nonIndexed, false)
    merged.computeBoundingSphere()
    for (const p of new Set([...pieces, ...nonIndexed])) p.dispose()
    geometryCache.set(typeID, merged)
    return merged
  }
  function material(colorID, style = 'solid') {
    const key = colorID + ':' + style
    if (materialCache.has(key)) return materialCache.get(key)
    const color = colorMap.get(colorID)?.hex ?? colorID ?? '#dbb552'
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.34,
      metalness: 0,
    })
    if (style === 'guide') {
      m.transparent = true
      m.opacity = 0.105
      m.depthWrite = false
      m.roughness = 0.6
    }
    if (style === 'hint') {
      m.color.set(0xffcf4e)
      m.emissive.set(0xffb000)
      m.emissiveIntensity = 0.35
      m.transparent = true
      m.opacity = 0.57
      m.depthWrite = false
    }
    if (style === 'ghost-valid') {
      m.transparent = true
      m.opacity = 0.58
      m.depthWrite = false
      m.emissive.set(0x609b75)
      m.emissiveIntensity = 0.18
    }
    if (style === 'ghost-invalid') {
      m.color.set(0xee6658)
      m.transparent = true
      m.opacity = 0.56
      m.depthWrite = false
      m.emissive.set(0xee6658)
      m.emissiveIntensity = 0.15
    }
    if (style === 'correct') m.color.set(0x65b985)
    if (style === 'incorrect') m.color.set(0xe96d60)
    materialCache.set(key, m)
    return m
  }
  function transformBrick(b, object = tempObject) {
    const f = footprint(b)
    object.position.set(b.x + f.w / 2 - 12, b.y * 0.4, b.z + f.d / 2 - 12)
    object.rotation.set(0, (-(b.rot || 0) * Math.PI) / 2, 0)
    object.scale.set(1, 1, 1)
    object.updateMatrix()
    return object.matrix
  }
  function clearGroup(group) {
    while (group.children.length) {
      const child = group.children[0]
      group.remove(child)
      if (child.isInstancedMesh) child.dispose()
      if (child.userData.ownGeometry) child.geometry.dispose()
      if (child.userData.ownMaterial) child.material.dispose()
    }
  }
  function makeBatches(group, bricks, style = 'solid') {
    clearGroup(group)
    const batches = new Map()
    for (const b of bricks) {
      if (!typeMap.has(b.type)) continue
      const appearance =
        style === 'compare'
          ? correct.has(brickKey(b))
            ? 'correct'
            : 'incorrect'
          : style
      const key = b.type + ':' + b.color + ':' + appearance
      if (!batches.has(key))
        batches.set(key, {
          type: b.type,
          color: b.color,
          appearance,
          bricks: [],
        })
      batches.get(key).bricks.push(b)
    }
    for (const batch of batches.values()) {
      const mesh = new THREE.InstancedMesh(
        geometry(batch.type),
        material(batch.color, batch.appearance),
        batch.bricks.length
      )
      batch.bricks.forEach((b, i) => mesh.setMatrixAt(i, transformBrick(b)))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
      mesh.castShadow = style === 'solid' || style === 'compare'
      mesh.receiveShadow = mesh.castShadow
      mesh.userData.bricks = batch.bricks
      mesh.renderOrder =
        style === 'guide' ? 1 : style.startsWith('ghost') ? 3 : 0
      group.add(mesh)
    }
  }
  function makePlate(group, ground, size = 24) {
    const g = roundedBody(size + 0.3, size + 0.3, 0.38),
      m = new THREE.MeshStandardMaterial({ color: 0xaabda3, roughness: 0.74 })
    const plate = new THREE.Mesh(g, m)
    plate.position.y = -0.41
    plate.receiveShadow = true
    group.add(plate)
    baseResources.push(g, m)
    const studGeo = new THREE.CylinderGeometry(0.276, 0.285, 0.12, 12),
      studMat = new THREE.MeshStandardMaterial({
        color: 0xb5c5af,
        roughness: 0.57,
      })
    const studs = new THREE.InstancedMesh(studGeo, studMat, size * size)
    for (let x = 0; x < size; x++)
      for (let z = 0; z < size; z++) {
        tempObject.position.set(x - (size - 1) / 2, 0.007, z - (size - 1) / 2)
        tempObject.rotation.set(0, 0, 0)
        tempObject.scale.set(1, 1, 1)
        tempObject.updateMatrix()
        studs.setMatrixAt(x * size + z, tempObject.matrix)
      }
    studs.instanceMatrix.needsUpdate = true
    studs.receiveShadow = true
    group.add(studs)
    baseResources.push(studGeo, studMat)
    const lines = []
    const half = size / 2
    for (let n = -half; n <= half; n++) {
      lines.push(
        -half,
        -0.024,
        n,
        half,
        -0.024,
        n,
        n,
        -0.024,
        -half,
        n,
        -0.024,
        half
      )
    }
    const gridGeo = new THREE.BufferGeometry()
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3))
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x738b6d,
      transparent: true,
      opacity: 0.12,
    })
    const grid = new THREE.LineSegments(gridGeo, gridMat)
    group.add(grid)
    baseResources.push(gridGeo, gridMat)
    if (ground) {
      const floorG = new THREE.PlaneGeometry(220, 220)
      const floorM = new THREE.ShadowMaterial({
        color: 0x33472f,
        opacity: 0.16,
        transparent: true,
      })
      const floor = new THREE.Mesh(floorG, floorM)
      floor.rotation.x = -Math.PI / 2
      floor.position.y = -0.45
      floor.receiveShadow = true
      scene.add(floor)
      baseResources.push(floorG, floorM)
    }
  }
  makePlate(plateGroup, true)
  makePlate(referencePlate, false)
  const raycaster = new THREE.Raycaster(),
    pointerVector = new THREE.Vector2()
  function setRay(x, y, el, cam) {
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return false
    pointerVector.set(
      ((x - rect.left) / rect.width) * 2 - 1,
      (-(y - rect.top) / rect.height) * 2 + 1
    )
    cam.updateMatrixWorld()
    raycaster.setFromCamera(pointerVector, cam)
    return true
  }
  function brickAt(group) {
    group.updateMatrixWorld(true)
    const hit = raycaster.intersectObjects(group.children, false)[0]
    return hit && hit.object.userData.bricks
      ? hit.object.userData.bricks[hit.instanceId]
      : null
  }
  function updateHover() {
    if (
      !pointer ||
      !options.isBuilding?.() ||
      !setRay(pointer.x, pointer.y, renderer.domElement, camera)
    ) {
      ghostGroup.visible = false
      return
    }
    ghostGroup.visible = !options.isPicking?.() && !options.isRemoving?.()
    hoverBrick = brickAt(buildGroup)
    const selection = options.getSelection?.()
    if (!selection || !typeMap.has(selection.type)) return
    const f = footprint({ ...selection, x: 0, z: 0, y: 0 })
    let candidate = null,
      nearest = Infinity
    const testTop = (top, cells = null) => {
      if (Math.abs(raycaster.ray.direction.y) < 0.0001) return
      const distance =
        (top * 0.4 - raycaster.ray.origin.y) / raycaster.ray.direction.y
      if (distance < 0 || distance > nearest) return
      vector
        .copy(raycaster.ray.direction)
        .multiplyScalar(distance)
        .add(raycaster.ray.origin)
      const gx = vector.x + 12,
        gz = vector.z + 12
      const x = Math.floor(gx - (f.w - 1) / 2),
        z = Math.floor(gz - (f.d - 1) / 2)
      const supported = cells
        ? cells.some(
            cell =>
              cell.x >= x && cell.x < x + f.w && cell.z >= z && cell.z < z + f.d
          )
        : gx >= -6 && gx <= 30 && gz >= -6 && gz <= 30
      if (supported) {
        nearest = distance
        candidate = {
          type: selection.type,
          color: selection.color,
          rot: selection.rot || 0,
          x,
          z,
          y: clamp(top, 0, 60),
        }
      }
    }
    testTop(0)
    for (const surface of buildSurfaces) testTop(surface.top, surface.cells)
    if (!candidate) {
      lastCandidate = null
      ghostGroup.visible = false
      options.onHover?.(null, hoverBrick, null)
      return
    }
    lastCandidate = candidate
    options.onHover?.(candidate, hoverBrick, { x: pointer.x, y: pointer.y })
    renderer.domElement.style.cursor = options.isPicking?.()
      ? 'crosshair'
      : pointerDown?.moved
        ? 'grabbing'
        : 'crosshair'
  }
  const contextMenu = e => e.preventDefault()
  const onMainDown = e => {
    if (e.target !== renderer.domElement) return
    pointer = { x: e.clientX, y: e.clientY }
    pointerDown = {
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      moved: false,
      id: e.pointerId,
      time: performance.now(),
    }
    if (e.pointerType === 'touch') {
      touchPointers.add(e.pointerId)
      if (touchPointers.size > 1) touchGesture = true
      pointerDown.moved = touchGesture
    }
    updateHover()
  }
  const touchPointers = new Set()
  let touchGesture = false
  const onMainMove = e => {
    pointer = { x: e.clientX, y: e.clientY }
    if (
      pointerDown &&
      Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) > 5
    )
      pointerDown.moved = true
    updateHover()
  }
  const onMainUp = e => {
    const down = pointerDown
    pointerDown = null
    touchPointers.delete(e.pointerId)
    if (!touchPointers.size) touchGesture = false
    if (
      !down ||
      down.id !== e.pointerId ||
      down.moved ||
      e.target !== renderer.domElement ||
      !options.isBuilding?.()
    )
      return
    pointer = { x: e.clientX, y: e.clientY }
    updateHover()
    if (options.isRemoving?.()) {
      if (hoverBrick) options.onRemove?.(hoverBrick)
      return
    }
    if (options.isPicking?.()) {
      if (hoverBrick) options.onPick?.(hoverBrick)
      return
    }
    if (down.button === 2) {
      if (hoverBrick) options.onRemove?.(hoverBrick)
    } else if (down.button === 0 && lastCandidate)
      options.onPlace?.({ ...lastCandidate })
  }
  const onLeave = () => {
    if (!pointerDown) {
      pointer = null
      hoverBrick = null
      lastCandidate = null
      ghostGroup.visible = false
      options.onHover?.(null, null, null)
    }
  }
  let refDown = null
  const onRefDown = e => {
    refDown = { x: e.clientX, y: e.clientY }
    referenceControls.enabled = !options.isPicking?.()
  }
  const onRefUp = e => {
    if (
      refDown &&
      Math.hypot(e.clientX - refDown.x, e.clientY - refDown.y) < 6 &&
      options.isPicking?.() &&
      setRay(
        e.clientX,
        e.clientY,
        referenceRenderer.domElement,
        referenceCamera
      )
    ) {
      const b = brickAt(targetGroup)
      if (b) options.onPick?.(b)
    }
    refDown = null
    referenceControls.enabled = true
  }
  renderer.domElement.addEventListener('contextmenu', contextMenu)
  renderer.domElement.addEventListener('pointerdown', onMainDown)
  renderer.domElement.addEventListener('pointermove', onMainMove)
  renderer.domElement.addEventListener('pointerleave', onLeave)
  window.addEventListener('pointerup', onMainUp)
  const onCancel = e => {
    touchPointers.delete(e.pointerId)
    pointerDown = null
    if (!touchPointers.size) touchGesture = false
  }
  window.addEventListener('pointercancel', onCancel)
  referenceRenderer.domElement.addEventListener('contextmenu', contextMenu)
  referenceRenderer.domElement.addEventListener('pointerdown', onRefDown)
  referenceRenderer.domElement.addEventListener('pointerup', onRefUp)
  function modelBounds(bricks) {
    if (!bricks.length)
      return {
        center: new THREE.Vector3(0, 1, 0),
        span: 14,
        height: 4,
        radius: 10,
      }
    let x1 = 24,
      z1 = 24,
      y1 = 60,
      x2 = 0,
      z2 = 0,
      y2 = 0
    for (const b of bricks) {
      const f = footprint(b)
      x1 = Math.min(x1, b.x)
      z1 = Math.min(z1, b.z)
      y1 = Math.min(y1, b.y)
      x2 = Math.max(x2, b.x + f.w)
      z2 = Math.max(z2, b.z + f.d)
      y2 = Math.max(y2, b.y + f.h)
    }
    return {
      center: new THREE.Vector3(
        (x1 + x2) / 2 - 12,
        (y1 + y2) * 0.2,
        (z1 + z2) / 2 - 12
      ),
      span: Math.max(x2 - x1, z2 - z1, (y2 - y1) * 0.4),
      height: (y2 - y1) * 0.4,
      radius: Math.hypot(x2 - x1, z2 - z1, (y2 - y1) * 0.4 + 0.3) / 2,
    }
  }
  function referenceFrame() {
    const bounds = modelBounds(target),
      halfFov = Math.atan(
        Math.tan(THREE.MathUtils.degToRad(referenceCamera.fov / 2)) *
          Math.min(1, referenceCamera.aspect)
      ),
      distance = Math.max(9, (bounds.radius / Math.sin(halfFov)) * 1.1)
    referenceControls.target.copy(bounds.center)
    referenceCamera.position
      .copy(bounds.center)
      .add(
        new THREE.Vector3(1, 0.82, -1.15).normalize().multiplyScalar(distance)
      )
    referenceCamera.lookAt(bounds.center)
    referenceControls.update()
  }
  function desiredFrame() {
    const bounds = modelBounds(build)
    const center = new THREE.Vector3(0, Math.min(3, bounds.height * 0.18), 0)
    const distance = Math.max(
      44,
      (30 / Math.min(1.2, camera.aspect)) * 1.65,
      bounds.height * 2.1
    )
    return {
      center,
      position: center
        .clone()
        .add(
          new THREE.Vector3(1, 0.96, -1.15).normalize().multiplyScalar(distance)
        ),
    }
  }
  function animateCamera(position, center) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(position)
      controls.target.copy(center)
      cameraTween = null
      return
    }
    cameraTween = {
      start: performance.now(),
      from: camera.position.clone(),
      to: position,
      fromTarget: controls.target.clone(),
      toTarget: center,
    }
  }
  function frame(immediate = false) {
    const f = desiredFrame()
    if (immediate) {
      camera.position.copy(f.position)
      controls.target.copy(f.center)
      camera.lookAt(f.center)
      controls.update()
    } else animateCamera(f.position, f.center)
  }
  function view(name) {
    const bounds = modelBounds(build),
      top = name === 'top'
    const center = top ? new THREE.Vector3(0, 0, 0) : bounds.center
    const span = top ? 27 : Math.max(16, bounds.span)
    const fit =
      (span /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
        Math.min(1, camera.aspect)) *
      1.18
    const distance = Math.min(
      controls.maxDistance,
      Math.max(32, camera.position.distanceTo(controls.target), fit)
    )
    const direction = top
      ? new THREE.Vector3(0, 1, 0.001)
      : name === 'side'
        ? new THREE.Vector3(1, 0.22, 0)
        : new THREE.Vector3(0, 0.22, -1)
    animateCamera(
      center.clone().add(direction.normalize().multiplyScalar(distance)),
      center
    )
  }
  let mainWidth = 0,
    mainHeight = 0,
    refWidth = 0,
    refHeight = 0
  function resizeCamera(
    viewCamera,
    orbit,
    aspect,
    initialized,
    wideAspect = 1
  ) {
    if (initialized) {
      // Keep the orbit and the user's zoom, compensating for the narrower field
      // of view when the panel switches between wide and portrait proportions.
      const scale =
        Math.min(wideAspect, viewCamera.aspect) / Math.min(wideAspect, aspect)
      const direction = viewCamera.position.clone().sub(orbit.target)
      direction.setLength(
        clamp(direction.length() * scale, orbit.minDistance, orbit.maxDistance)
      )
      viewCamera.position.copy(orbit.target).add(direction)
    }
    viewCamera.aspect = aspect
    viewCamera.updateProjectionMatrix()
    orbit.update()
  }
  function resize() {
    const rect = mainEl.getBoundingClientRect()
    const rw = Math.round(rect.width),
      rh = Math.round(rect.height)
    if (rw > 0 && rh > 0 && (rw !== mainWidth || rh !== mainHeight)) {
      renderer.setSize(rw, rh, false)
      resizeCamera(camera, controls, rw / rh, mainWidth > 0, 1.2)
      cameraTween = null
      mainWidth = rw
      mainHeight = rh
    }
    const rr = referenceEl.getBoundingClientRect()
    const ww = Math.round(rr.width),
      hh = Math.round(rr.height)
    if (ww > 0 && hh > 0 && (ww !== refWidth || hh !== refHeight)) {
      referenceRenderer.setSize(ww, hh, false)
      resizeCamera(referenceCamera, referenceControls, ww / hh, refWidth > 0)
      refWidth = ww
      refHeight = hh
    }
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(mainEl)
  resizeObserver.observe(referenceEl)
  const confettiGeo = new THREE.PlaneGeometry(0.13, 0.28),
    confettiMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const confetti = new THREE.InstancedMesh(confettiGeo, confettiMat, 140)
  confetti.visible = false
  confetti.frustumCulled = false
  celebrationGroup.add(confetti)
  let particleData = []
  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    celebrationStart = performance.now()
    spinOffset = 0
    confetti.visible = true
    particleData = []
    const colors = [0xe97760, 0xf9d264, 0x82b6a3, 0x78a8c9, 0xe4a5b7]
    for (let i = 0; i < 140; i++) {
      particleData.push({
        x: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 16,
        y: 9 + Math.random() * 13,
        v: 0.9 + Math.random() * 1.6,
        r: Math.random() * 6,
      })
      confetti.setColorAt(i, new THREE.Color(colors[i % colors.length]))
    }
    if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true
  }
  function tick(now) {
    if (disposed || !active) return
    const dt = Math.min(0.05, (now - lastTime) / 1000)
    lastTime = now
    if (cameraTween) {
      const t = clamp((now - cameraTween.start) / 500, 0, 1),
        ease = 1 - Math.pow(1 - t, 3)
      camera.position.lerpVectors(cameraTween.from, cameraTween.to, ease)
      controls.target.lerpVectors(
        cameraTween.fromTarget,
        cameraTween.toTarget,
        ease
      )
      if (t >= 1) cameraTween = null
    }
    controls.update()
    referenceControls.update()
    if (hints.length) {
      const opacity = 0.38 + Math.sin(now * 0.006) * 0.2
      for (const m of hintGroup.children) m.material.opacity = opacity
    }
    if (celebrationStart) {
      const elapsed = (now - celebrationStart) / 1000
      if (elapsed < 5) {
        const next = Math.min(1, elapsed / 4) * Math.PI * 2
        const delta = next - spinOffset
        spinOffset = next
        const offset = camera.position.clone().sub(controls.target)
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta)
        camera.position.copy(controls.target).add(offset)
        camera.lookAt(controls.target)
        particleData.forEach((p, i) => {
          tempObject.position.set(
            p.x + Math.sin(elapsed + p.r) * 0.7,
            p.y - elapsed * p.v * 2,
            p.z + Math.cos(elapsed + p.r) * 0.7
          )
          tempObject.rotation.set(
            p.r + elapsed * 2,
            elapsed + p.r,
            elapsed * 1.4 + p.r
          )
          tempObject.scale.setScalar(elapsed > 4 ? 5 - elapsed : 1)
          tempObject.updateMatrix()
          confetti.setMatrixAt(i, tempObject.matrix)
        })
        confetti.instanceMatrix.needsUpdate = true
      } else {
        celebrationStart = 0
        confetti.visible = false
      }
    }
    renderer.render(scene, camera)
    if (refWidth > 0 && refHeight > 0 && referenceEl.getClientRects().length)
      referenceRenderer.render(referenceScene, referenceCamera)
    animationID = requestAnimationFrame(tick)
  }
  function onVisibility() {
    cancelAnimationFrame(animationID)
    active = !document.hidden
    if (active) {
      lastTime = performance.now()
      animationID = requestAnimationFrame(tick)
    } else cancelAnimationFrame(animationID)
  }
  document.addEventListener('visibilitychange', onVisibility)
  controls.addEventListener('change', () => {
    if (pointer && !pointerDown) updateHover()
  })
  resize()
  frame(true)
  referenceFrame()
  if (active) animationID = requestAnimationFrame(tick)
  return {
    setBuild(bricks) {
      build = bricks.slice()
      buildSurfaces = build.map(b => ({
        top: b.y + footprint(b).h,
        cells: supportSurface(b),
      }))
      makeBatches(buildGroup, build, comparison ? 'compare' : 'solid')
      renderer.shadowMap.needsUpdate = true
      updateHover()
    },
    setTarget(bricks) {
      target = bricks.slice()
      makeBatches(
        targetGroup,
        target.filter(b => b.y < peel)
      )
      referenceFrame()
    },
    setGuides(bricks) {
      guides = bricks.slice()
      makeBatches(guideGroup, guides, 'guide')
    },
    setMissing(bricks) {
      clearGroup(missingGroup)
      if (!bricks.length) return
      const positions = [],
        edges = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
          [4, 5],
          [5, 6],
          [6, 7],
          [7, 4],
          [0, 4],
          [1, 5],
          [2, 6],
          [3, 7],
        ]
      for (const b of bricks) {
        const f = footprint(b),
          x = b.x - 12 + 0.035,
          z = b.z - 12 + 0.035,
          y = b.y * 0.4 + 0.035,
          w = f.w - 0.07,
          d = f.d - 0.07,
          h = f.h * 0.4 - 0.07
        const points = [
          [x, y, z],
          [x + w, y, z],
          [x + w, y, z + d],
          [x, y, z + d],
          [x, y + h, z],
          [x + w, y + h, z],
          [x + w, y + h, z + d],
          [x, y + h, z + d],
        ]
        for (const [a, c] of edges) positions.push(...points[a], ...points[c])
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
      )
      const mat = new THREE.LineBasicMaterial({
        color: 0x408575,
        transparent: true,
        opacity: 0.8,
        depthTest: false,
      })
      const mesh = new THREE.LineSegments(geo, mat)
      mesh.userData.ownGeometry = true
      mesh.userData.ownMaterial = true
      mesh.renderOrder = 5
      missingGroup.add(mesh)
    },
    setHint(bricks) {
      hints = bricks.slice()
      makeBatches(hintGroup, hints, 'hint')
    },
    setGhost(brick, valid) {
      if (!brick) {
        lastGhostKey = ''
        clearGroup(ghostGroup)
        return
      }
      const key = [
        brick.type,
        brick.color,
        brick.rot,
        brick.x,
        brick.y,
        brick.z,
        !!valid,
      ].join(':')
      if (key !== lastGhostKey) {
        lastGhostKey = key
        makeBatches(
          ghostGroup,
          [brick],
          valid ? 'ghost-valid' : 'ghost-invalid'
        )
      }
      ghostGroup.visible = !options.isPicking?.() && !options.isRemoving?.()
    },
    setCompare(enabled, correctKeys) {
      const next = !!enabled,
        keys = correctKeys || new Set()
      const same =
        comparison === next &&
        (!next ||
          (keys.size === correct.size && [...keys].every(k => correct.has(k))))
      correct = new Set(keys)
      comparison = next
      if (!same)
        makeBatches(buildGroup, build, comparison ? 'compare' : 'solid')
    },
    setPeel(value) {
      peel = clamp(value, 0, 60)
      makeBatches(
        targetGroup,
        target.filter(b => b.y < peel)
      )
    },
    frame,
    referenceFrame,
    view,
    celebrate,
    resize,
    refreshHover: updateHover,
    setLabels(labels) {
      renderer.domElement.setAttribute('aria-label', labels.workspace)
      referenceRenderer.domElement.setAttribute('aria-label', labels.reference)
    },
    projectBrick(b, top = false) {
      const f = footprint(b)
      vector.set(
        b.x + f.w / 2 - 12,
        (b.y + (top ? f.h : 0)) * 0.4,
        b.z + f.d / 2 - 12
      )
      camera.updateMatrixWorld()
      vector.project(camera)
      const r = renderer.domElement.getBoundingClientRect()
      return {
        x: r.left + ((vector.x + 1) * r.width) / 2,
        y: r.top + ((1 - vector.y) * r.height) / 2,
      }
    },
    getStats() {
      return {
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        bricks: build.length,
        targetBricks: target.length,
        geometries: renderer.info.memory.geometries,
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(animationID)
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointerup', onMainUp)
      window.removeEventListener('pointercancel', onCancel)
      controls.dispose()
      referenceControls.dispose()
      ;[
        buildGroup,
        targetGroup,
        guideGroup,
        hintGroup,
        ghostGroup,
        missingGroup,
      ].forEach(clearGroup)
      for (const resource of [
        ...geometryCache.values(),
        ...materialCache.values(),
        ...baseResources,
        confettiGeo,
        confettiMat,
      ])
        resource.dispose()
      renderer.domElement.removeEventListener('contextmenu', contextMenu)
      renderer.domElement.removeEventListener('pointerdown', onMainDown)
      renderer.domElement.removeEventListener('pointermove', onMainMove)
      renderer.domElement.removeEventListener('pointerleave', onLeave)
      referenceRenderer.domElement.removeEventListener(
        'contextmenu',
        contextMenu
      )
      referenceRenderer.domElement.removeEventListener('pointerdown', onRefDown)
      referenceRenderer.domElement.removeEventListener('pointerup', onRefUp)
      ;[plateGroup, referencePlate, celebrationGroup].forEach(clearGroup)
      renderer.dispose()
      referenceRenderer.dispose()
      renderer.domElement.remove()
      referenceRenderer.domElement.remove()
    },
  }
}
