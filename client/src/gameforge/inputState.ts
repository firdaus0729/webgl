const pressedCodes = new Set<string>()
let attached = false
let refCount = 0

function onKeyDown(e: KeyboardEvent) {
  if (e.code) {
    pressedCodes.add(e.code)
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code) {
    pressedCodes.delete(e.code)
  }
}

export function attachGlobalInput() {
  refCount += 1
  if (attached) return
  window.addEventListener('keydown', onKeyDown, { capture: true })
  window.addEventListener('keyup', onKeyUp, { capture: true })
  attached = true
}

export function detachGlobalInput() {
  refCount = Math.max(0, refCount - 1)
  if (!attached || refCount > 0) return
  window.removeEventListener('keydown', onKeyDown, { capture: true })
  window.removeEventListener('keyup', onKeyUp, { capture: true })
  pressedCodes.clear()
  attached = false
}

export function isCodeDown(code: string) {
  return pressedCodes.has(code)
}

