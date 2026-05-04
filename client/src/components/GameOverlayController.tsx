import { useEffect, useRef } from 'react'

import {
  mountGameFromConfig,
  mountGameFromPrompt,
  type GameMount,
} from '@/gameforge/createGameInstance'
import type { GameConfig } from '@/gameforge/GameConfig'
import { generateGameConfigFromAI } from '@/gameforge/llmGenerateConfig'
import { logDeterministicGameConfigFallback } from '@/gameforge/logDeterministicFallback'
import { isValidGameConfig } from '@/gameforge/validateGameConfig'

function findPromptInput(): HTMLInputElement | null {
  const byHook = document.querySelector('input[data-igraverse-prompt]')
  if (byHook instanceof HTMLInputElement) return byHook
  return document.querySelector(
    'input[placeholder="Describe the game you want to build..."]',
  )
}

function findGenerateButton(): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll('button'))
  const btn = buttons.find((b) => b.textContent?.trim() === 'Generate Game')
  return btn as HTMLButtonElement | null
}

export default function GameOverlayController() {
  const mountRef = useRef<GameMount | null>(null)
  const overlayElRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onClick = () => {
      const input = findPromptInput()
      const prompt = typeof input?.value === 'string' ? input.value : ''
      const moduleHint = parseGameConfigFromInput(input)

      const existing = overlayElRef.current
      if (existing) {
        mountRef.current?.destroy()
        mountRef.current = null
        existing.remove()
        overlayElRef.current = null
      }

      const overlay = document.createElement('div')
      overlayRefFix(overlay)
      overlayElRef.current = overlay

      const stage = document.createElement('div')
      // Full-viewport layout: game UI fills the entire browser.
      stage.style.position = 'fixed'
      stage.style.left = '0'
      stage.style.top = '0'
      stage.style.width = '100vw'
      stage.style.height = '100vh'
      stage.style.borderRadius = '0'
      stage.style.overflow = 'hidden'
      stage.style.boxShadow = 'none'
      stage.style.zIndex = '10000'

      overlay.appendChild(stage)
      document.body.appendChild(overlay)

      document.body.style.overflow = 'hidden'

      let mounted: GameMount | null = null
      let destroy = () => {}

      const onEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          destroy()
          return
        }
        if (e.key === 'f' || e.key === 'F') {
          // Toggle browser fullscreen for the game stage.
          void toggleFullscreen()
        }
      }

      const toggleFullscreen = async () => {
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen()
          } else {
            await stage.requestFullscreen({ navigationUI: 'hide' as any })
          }
        } catch {
          // Ignore fullscreen errors (e.g., user gesture requirement).
        }
      }

      destroy = () => {
        window.removeEventListener('keydown', onEsc)
        mounted?.destroy()
        mounted = null
        mountRef.current = null
        overlay.remove()
        overlayElRef.current = null
        document.body.style.overflow = ''
      }

      window.addEventListener('keydown', onEsc)

      const host = stage

      const loading = document.createElement('div')
      loading.textContent = 'Generating game…'
      loading.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;font-size:1.25rem;color:#e8e8f0;background:#0a0a12;z-index:2;'
      stage.appendChild(loading)

      void (async () => {
        try {
          const aiConfig = await generateGameConfigFromAI(prompt, moduleHint)
          loading.remove()
          mounted = mountGameFromConfig(aiConfig, host)
          mountRef.current = mounted
        } catch (err) {
          logDeterministicGameConfigFallback(err)
          loading.remove()
          mounted = moduleHint
            ? mountGameFromConfig(moduleHint, host)
            : mountGameFromPrompt(prompt, host)
          mountRef.current = mounted
        }
      })()
    }

    let boundBtn: HTMLButtonElement | null = null

    const tryAttach = () => {
      const btn = findGenerateButton()
      if (!btn) return
      if (boundBtn === btn) return

      // If the Home page re-rendered, the button element reference changed.
      if (boundBtn) boundBtn.removeEventListener('click', onClick)
      const input = findPromptInput()
      if (!input) return
      boundBtn = btn
      btn.addEventListener('click', onClick)
    }

    tryAttach()
    const mo = new MutationObserver(() => tryAttach())
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      if (boundBtn) boundBtn.removeEventListener('click', onClick)
      mountRef.current?.destroy()
      mountRef.current = null
      overlayElRef.current?.remove()
      overlayElRef.current = null
      document.body.style.overflow = ''
    }
  }, [])

  return null
}

function parseGameConfigFromInput(input: HTMLInputElement | null): GameConfig | null {
  const raw = input?.dataset?.gameConfig
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return isValidGameConfig(parsed) ? parsed : null
  } catch {
    return null
  }
}

function overlayRefFix(overlay: HTMLDivElement) {
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'transparent'
  overlay.style.zIndex = '9999'
  overlay.style.display = 'block'
  overlay.addEventListener('contextmenu', (e) => e.preventDefault())
}

