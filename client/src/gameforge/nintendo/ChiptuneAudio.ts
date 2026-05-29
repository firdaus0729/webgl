/**
 * Procedural NES-style chiptune SFX + looping BGM via Web Audio API.
 * No external assets required.
 */

export type SfxName =
  | 'jump'
  | 'land'
  | 'coin'
  | 'stomp'
  | 'hurt'
  | 'shoot'
  | 'enemyDefeat'
  | 'win'
  | 'lose'
  | 'fanfare'
  | 'punch'
  | 'heavyPunch'
  | 'bell'
  | 'pause'
  | 'powerUp'
  | 'checkpoint'
  | 'blockHit'

export type BgmMode = 'platformer' | 'shooter' | 'arena' | 'boxing' | 'off'

const NOTE: Record<string, number> = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  B5: 987.77,
  E6: 1318.51,
}

type ToneStep = {
  freq: number
  at: number
  dur: number
  type?: OscillatorType
  gain?: number
}

class ChiptuneAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxGain: GainNode | null = null
  private bgmGain: GainNode | null = null
  private unlocked = false
  private unlockHandler: (() => void) | null = null
  private bgmMode: BgmMode = 'off'
  private bgmTimer: ReturnType<typeof setInterval> | null = null
  private bgmStep = 0
  private muted = false

  bindUnlock(host: HTMLElement) {
    if (this.unlockHandler) return
    const unlock = () => {
      void this.ensureContext()?.resume()
      this.unlocked = true
      if (this.bgmMode !== 'off') this.startBgm(this.bgmMode)
      host.removeEventListener('keydown', unlock)
      host.removeEventListener('pointerdown', unlock)
      this.unlockHandler = null
    }
    this.unlockHandler = unlock
    host.addEventListener('keydown', unlock, { once: true })
    host.addEventListener('pointerdown', unlock, { once: true })
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.master) this.master.gain.value = muted ? 0 : 1
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.85
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.55
      this.bgmGain = this.ctx.createGain()
      this.bgmGain.gain.value = 0.22
      this.sfxGain.connect(this.master)
      this.bgmGain.connect(this.master)
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  play(name: SfxName) {
    const ctx = this.ensureContext()
    if (!ctx || !this.sfxGain) return
    if (ctx.state === 'suspended') void ctx.resume()

    const t0 = ctx.currentTime + 0.001
    switch (name) {
      case 'jump':
        this.playSweep(ctx, t0, 180, 520, 0.11, 'square', 0.35)
        break
      case 'land':
        this.playTone(ctx, t0, NOTE.G3, 0.04, 'triangle', 0.18)
        break
      case 'coin':
        this.playTone(ctx, t0, NOTE.B5, 0.07, 'square', 0.32)
        this.playTone(ctx, t0 + 0.07, NOTE.E6, 0.12, 'square', 0.34)
        break
      case 'stomp':
        this.playNoise(ctx, t0, 0.08, 0.28)
        this.playTone(ctx, t0, 90, 0.09, 'triangle', 0.35)
        break
      case 'hurt':
        this.playSequence(ctx, t0, [
          { freq: NOTE.A4, at: 0, dur: 0.08, type: 'square', gain: 0.3 },
          { freq: NOTE.F4, at: 0.09, dur: 0.1, type: 'square', gain: 0.28 },
          { freq: NOTE.D4, at: 0.2, dur: 0.14, type: 'square', gain: 0.25 },
        ])
        break
      case 'shoot':
        this.playTone(ctx, t0, NOTE.E5, 0.05, 'square', 0.22)
        this.playTone(ctx, t0 + 0.02, NOTE.G5, 0.04, 'square', 0.15)
        break
      case 'enemyDefeat':
        this.playNoise(ctx, t0, 0.1, 0.22)
        this.playSweep(ctx, t0, 420, 80, 0.14, 'square', 0.25)
        break
      case 'win':
        this.playFanfare(ctx, t0, false)
        break
      case 'fanfare':
        this.playFanfare(ctx, t0, true)
        break
      case 'lose':
        this.playSequence(ctx, t0, [
          { freq: NOTE.E4, at: 0, dur: 0.15, type: 'triangle', gain: 0.3 },
          { freq: NOTE.C4, at: 0.16, dur: 0.15, type: 'triangle', gain: 0.28 },
          { freq: NOTE.A3, at: 0.32, dur: 0.28, type: 'triangle', gain: 0.26 },
        ])
        break
      case 'punch':
        this.playNoise(ctx, t0, 0.04, 0.2)
        this.playTone(ctx, t0, 110, 0.05, 'square', 0.28)
        break
      case 'heavyPunch':
        this.playNoise(ctx, t0, 0.07, 0.32)
        this.playTone(ctx, t0, 75, 0.1, 'square', 0.38)
        this.playTone(ctx, t0 + 0.04, 55, 0.08, 'triangle', 0.25)
        break
      case 'bell':
        this.playTone(ctx, t0, NOTE.E5, 0.18, 'sine', 0.35)
        this.playTone(ctx, t0 + 0.22, NOTE.E5, 0.22, 'sine', 0.32)
        break
      case 'pause':
        this.playTone(ctx, t0, NOTE.A4, 0.06, 'square', 0.2)
        break
      case 'powerUp':
        this.playSequence(ctx, t0, [
          { freq: NOTE.C4, at: 0, dur: 0.07, type: 'square', gain: 0.28 },
          { freq: NOTE.E4, at: 0.08, dur: 0.07, type: 'square', gain: 0.3 },
          { freq: NOTE.G4, at: 0.16, dur: 0.07, type: 'square', gain: 0.32 },
          { freq: NOTE.C5, at: 0.24, dur: 0.14, type: 'square', gain: 0.34 },
        ])
        break
      case 'checkpoint':
        this.playTone(ctx, t0, NOTE.G4, 0.1, 'square', 0.28)
        this.playTone(ctx, t0 + 0.1, NOTE.C5, 0.16, 'square', 0.32)
        break
      case 'blockHit':
        this.playTone(ctx, t0, NOTE.B4, 0.05, 'square', 0.26)
        this.playTone(ctx, t0 + 0.04, NOTE.D5, 0.06, 'square', 0.22)
        break
    }
  }

  startBgm(mode: BgmMode) {
    this.bgmMode = mode
    this.stopBgm()
    if (mode === 'off') return
    const ctx = this.ensureContext()
    if (!ctx || !this.bgmGain) return

    const patterns: Record<Exclude<BgmMode, 'off'>, number[]> = {
      platformer: [
        NOTE.E4, NOTE.G4, NOTE.E4, NOTE.C4,
        NOTE.D4, NOTE.F4, NOTE.D4, NOTE.G3,
        NOTE.C4, NOTE.E4, NOTE.G4, NOTE.E4,
        NOTE.F4, NOTE.D4, NOTE.C4, NOTE.G3,
      ],
      shooter: [
        NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4,
        NOTE.G4, NOTE.E4, NOTE.C4, NOTE.A3,
        NOTE.B3, NOTE.D4, NOTE.F4, NOTE.A4,
        NOTE.G4, NOTE.F4, NOTE.D4, NOTE.B3,
      ],
      arena: [
        NOTE.C4, NOTE.C4, NOTE.G4, NOTE.G4,
        NOTE.A4, NOTE.A4, NOTE.G4, NOTE.F4,
        NOTE.F4, NOTE.F4, NOTE.D4, NOTE.D4,
        NOTE.C4, NOTE.G3, NOTE.C4, NOTE.G3,
      ],
      boxing: [
        NOTE.G3, NOTE.G3, NOTE.C4, NOTE.D4,
        NOTE.E4, NOTE.D4, NOTE.C4, NOTE.G3,
        NOTE.A3, NOTE.A3, NOTE.D4, NOTE.E4,
        NOTE.F4, NOTE.E4, NOTE.D4, NOTE.A3,
      ],
    }

    const pattern = patterns[mode]
    const beatMs = mode === 'boxing' ? 210 : mode === 'shooter' ? 165 : 180
    this.bgmStep = 0

    this.bgmTimer = setInterval(() => {
      if (!this.ctx || !this.bgmGain || this.bgmMode !== mode) return
      const freq = pattern[this.bgmStep % pattern.length]
      this.bgmStep++
      const t0 = this.ctx.currentTime + 0.001
      this.playTone(this.ctx, t0, freq, beatMs / 1000 * 0.85, 'triangle', 0.55, this.bgmGain)
    }, beatMs)
  }

  stopBgm() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer)
      this.bgmTimer = null
    }
  }

  stopAll() {
    this.stopBgm()
    this.bgmMode = 'off'
    this.unlockHandler = null
    this.unlocked = false
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
      this.master = null
      this.sfxGain = null
      this.bgmGain = null
    }
  }

  private playTone(
    ctx: AudioContext,
    start: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    dest?: GainNode,
  ) {
    const out = dest ?? this.sfxGain
    if (!out) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain)
    gain.connect(out)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  }

  private playSweep(
    ctx: AudioContext,
    start: number,
    from: number,
    to: number,
    dur: number,
    type: OscillatorType,
    peak: number,
  ) {
    if (!this.sfxGain) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, start)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + dur * 0.55)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain)
    gain.connect(this.sfxGain)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  }

  private playNoise(ctx: AudioContext, start: number, dur: number, peak: number) {
    if (!this.sfxGain) return
    const bufferSize = Math.floor(ctx.sampleRate * dur)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(peak, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    src.connect(gain)
    gain.connect(this.sfxGain)
    src.start(start)
    src.stop(start + dur + 0.01)
  }

  private playSequence(ctx: AudioContext, start: number, steps: ToneStep[]) {
    for (const s of steps) {
      this.playTone(ctx, start + s.at, s.freq, s.dur, s.type ?? 'square', s.gain ?? 0.3)
    }
  }

  private playFanfare(ctx: AudioContext, start: number, extended: boolean) {
    const melody = extended
      ? [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C5, NOTE.G5, NOTE.E5, NOTE.C5, NOTE.G5]
      : [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C5]
    melody.forEach((freq, i) => {
      this.playTone(ctx, start + i * 0.11, freq, 0.13, 'square', 0.32)
    })
    if (extended) {
      this.playTone(ctx, start + 0.95, NOTE.C4, 0.35, 'triangle', 0.28, this.bgmGain ?? undefined)
    }
  }
}

let instance: ChiptuneAudio | null = null

export function getChiptuneAudio(): ChiptuneAudio {
  if (!instance) instance = new ChiptuneAudio()
  return instance
}

export function playSfx(name: SfxName) {
  getChiptuneAudio().play(name)
}

export function bgmForGameType(
  gameType: 'platformer' | 'top_down_arena' | 'retro_shooter' | 'boxing_1v1',
): BgmMode {
  switch (gameType) {
    case 'retro_shooter':
      return 'shooter'
    case 'top_down_arena':
      return 'arena'
    case 'boxing_1v1':
      return 'boxing'
    default:
      return 'platformer'
  }
}
