import type { ModuleSelectionState } from "./moduleSelectionToConfig"

export const STUDIO_GAME_TYPES = [
  "platformer",
  "top-down arena",
  "retro shooter",
  "boxing 1v1",
] as const
export type StudioGameTypeLabel = (typeof STUDIO_GAME_TYPES)[number]

export type StudioModuleField =
  | "movement"
  | "interaction"
  | "behavior"
  | "rules"
  | "visualStyle"
  | "audio"

export type StudioLayout = {
  visiblePanels: StudioModuleField[]
  options: Record<StudioModuleField, readonly string[]>
  hiddenDefaults: Partial<Pick<ModuleSelectionState, StudioModuleField>>
}

const MOVEMENT_ALL = [
  "run and jump",
  "run + double jump",
  "8-direction move",
  "dash + jump",
] as const

const INTERACTION_ALL = [
  "collect items",
  "collide with enemies",
  "shoot enemies",
  "activate switches",
] as const

const BEHAVIOR_ALL = [
  "patrol guards",
  "follow when near",
  "stationary turrets",
  "wave spawns",
] as const

const RULES_ALL = [
  "score + lives",
  "score + timer",
  "collect all relics",
  "survive waves",
] as const

const VISUAL_ALL = ["pixel art", "8-bit retro", "16-bit retro", "cartoon retro"] as const

const AUDIO_ALL = ["simple chiptune", "retro arcade loop", "minimal SFX", "chiptune + SFX"] as const
const AUDIO_BOXING = ["crowd chants + bell", "arena bass loop", "minimal SFX", "retro arcade loop"] as const

/** Full option matrix per genre: visible rails use subsets; hidden rails read only `hiddenDefaults`. */
export const STUDIO_LAYOUT_BY_GAME_TYPE: Record<StudioGameTypeLabel, StudioLayout> = {
  platformer: {
    visiblePanels: ["movement", "interaction", "behavior", "rules", "visualStyle", "audio"],
    options: {
      movement: MOVEMENT_ALL,
      interaction: INTERACTION_ALL,
      behavior: BEHAVIOR_ALL,
      rules: RULES_ALL,
      visualStyle: VISUAL_ALL,
      audio: AUDIO_ALL,
    },
    hiddenDefaults: {},
  },
  "top-down arena": {
    visiblePanels: ["movement", "interaction", "behavior", "rules", "visualStyle", "audio"],
    options: {
      movement: ["8-direction move", "dash + jump"],
      interaction: ["collide with enemies", "shoot enemies", "activate switches"],
      behavior: ["patrol guards", "follow when near", "wave spawns"],
      rules: ["score + timer", "survive waves", "score + lives"],
      visualStyle: VISUAL_ALL,
      audio: AUDIO_ALL,
    },
    hiddenDefaults: {},
  },
  "retro shooter": {
    visiblePanels: ["interaction", "behavior", "rules", "visualStyle", "audio"],
    options: {
      movement: MOVEMENT_ALL,
      interaction: ["shoot enemies", "collide with enemies", "activate switches"],
      behavior: ["wave spawns", "stationary turrets", "patrol guards"],
      rules: ["score + lives", "survive waves", "score + timer"],
      visualStyle: VISUAL_ALL,
      audio: AUDIO_ALL,
    },
    hiddenDefaults: {
      movement: "run and jump",
    },
  },
  "boxing 1v1": {
    visiblePanels: ["interaction", "behavior", "rules", "visualStyle", "audio"],
    options: {
      movement: MOVEMENT_ALL,
      interaction: ["jab + cross rhythm", "body-shot pressure", "power hooks", "feint then counter"],
      behavior: ["counter boxer", "aggressive brawler", "technical footwork", "high guard pressure"],
      rules: ["3 rounds decision", "5 rounds title fight", "sudden KO bout", "championship distance"],
      visualStyle: ["16-bit retro", "cartoon retro", "pixel art", "8-bit retro"],
      audio: AUDIO_BOXING,
    },
    hiddenDefaults: {
      movement: "dash + jump",
    },
  },
}

export function layoutForGameTypeLabel(label: string): StudioLayout {
  if (label === "top-down arena") return STUDIO_LAYOUT_BY_GAME_TYPE["top-down arena"]
  if (label === "retro shooter") return STUDIO_LAYOUT_BY_GAME_TYPE["retro shooter"]
  if (label === "boxing 1v1") return STUDIO_LAYOUT_BY_GAME_TYPE["boxing 1v1"]
  return STUDIO_LAYOUT_BY_GAME_TYPE.platformer
}

export function clampToOptions(value: string, allowed: readonly string[]): string {
  return allowed.includes(value) ? value : allowed[0]!
}

const FIELD_LABELS: Record<StudioModuleField, string> = {
  movement: "Movement",
  interaction: "Interaction",
  behavior: "Enemy behavior",
  rules: "Rules",
  visualStyle: "Visual style",
  audio: "Audio",
}

export function studioFieldLabel(field: StudioModuleField): string {
  return FIELD_LABELS[field]
}

export function buildPromptFragmentsFromLayout(
  layout: StudioLayout,
  sel: Pick<
    ModuleSelectionState,
    "movement" | "interaction" | "behavior" | "rules" | "visualStyle" | "audio"
  >,
): string[] {
  const parts: string[] = []
  for (const field of layout.visiblePanels) {
    switch (field) {
      case "movement":
        parts.push(`with ${sel.movement}`)
        break
      case "interaction":
        parts.push(`interaction: ${sel.interaction}`)
        break
      case "behavior":
        parts.push(`behavior: ${sel.behavior}`)
        break
      case "rules":
        parts.push(`rules: ${sel.rules}`)
        break
      case "visualStyle":
        parts.push(`visual style: ${sel.visualStyle}`)
        break
      case "audio":
        parts.push(`audio: ${sel.audio}`)
        break
      default:
        break
    }
  }
  return parts
}
