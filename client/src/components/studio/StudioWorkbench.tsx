import { useEffect, useMemo, useRef, useState } from "react"
import { Gamepad2, MonitorPlay, SlidersHorizontal, Sparkles, Terminal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import {
  applyStudioTuning,
  DEFAULT_STUDIO_TUNING,
  type StudioTuning,
} from "@/gameforge/applyStudioTuning"
import { gameConfigFromModuleSelection, type ModuleSelectionState } from "@/gameforge/moduleSelectionToConfig"
import { mountGameFromConfig, type GameMount } from "@/gameforge/createGameInstance"
import { hashStringToUint32 } from "@/gameforge/sessionSeed"
import {
  buildPromptFragmentsFromLayout,
  clampToOptions,
  layoutForGameTypeLabel,
  STUDIO_GAME_TYPES,
  STUDIO_LAYOUT_BY_GAME_TYPE,
  studioFieldLabel,
  type StudioModuleField,
} from "@/gameforge/studioModuleLayouts"

type StudioPanelId = "gameType" | StudioModuleField | null

const PANEL_HINTS: Record<Exclude<StudioPanelId, null>, string> = {
  gameType:
    "Genre drives which runtime is used (platformer, arena, vertical shooter, or boxing 1v1). The preview remasters when you switch.",
  movement:
    "Alters platform density in side-view modes and how spacious the run feels. Open-world movement maps to lower platform density in shooters.",
  interaction:
    "Sets default enemy pressure (how crowded encounters get) before you fine-tune the slider.",
  behavior:
    "Selects which enemy archetype the generator favors on bridges or waves.",
  rules:
    "Chooses level span presets (compact vs extended arenas).",
  visualStyle: "Maps to theme palette and ambience for the retro pipeline.",
  audio: "Audio preset label flows into the composed prompt for generation.",
}

function challengeLabel(n: number): string {
  if (n < 34) return "easy"
  if (n < 67) return "medium"
  return "hard"
}

function ModuleOptionCard({
  label,
  options,
  selected,
  onPick,
  id,
  activePanel,
  onActivatePanel,
}: {
  label: string
  options: readonly string[]
  selected: string
  onPick: (v: string) => void
  id: Exclude<StudioPanelId, null>
  activePanel: StudioPanelId
  onActivatePanel: (id: StudioPanelId) => void
}) {
  const isFocused = activePanel === id
  return (
    <Card
      className={cn(
        "border bg-card/80 backdrop-blur-sm transition-shadow",
        isFocused && "ring-2 ring-primary/50 shadow-[0_0_24px_rgba(0,212,255,0.12)]",
      )}
    >
      <CardHeader
        className="cursor-pointer py-4 pb-2"
        onClick={() => onActivatePanel(isFocused ? null : id)}
      >
        <CardTitle className="text-sm font-display tracking-wide uppercase text-foreground/90">
          {label}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Tap header to focus tuning hints →
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 pb-4">
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onPick(option)
                onActivatePanel(id)
              }}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                selected === option
                  ? "border-primary/70 bg-primary/15 text-foreground shadow-sm"
                  : "border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:border-border",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StudioLivePreview({
  config,
  layoutSeed,
}: {
  config: ReturnType<typeof applyStudioTuning>
  layoutSeed: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<GameMount | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    mountRef.current?.destroy()
    mountRef.current = mountGameFromConfig(config, host, { sessionSeed: layoutSeed })
    return () => {
      mountRef.current?.destroy()
      mountRef.current = null
    }
  }, [config, layoutSeed])

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-primary/25 bg-black/50 shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]">
      <div className="aspect-video w-full">
        <div
          ref={hostRef}
          className="h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          tabIndex={0}
          aria-label="Live game preview — click then use WASD, J to shoot, P pause"
        />
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center">
        <span className="rounded-md bg-background/70 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
          WASD · Jump W · Shoot J · Pause P · Focus canvas to play
        </span>
      </div>
    </div>
  )
}

const initialLayout = STUDIO_LAYOUT_BY_GAME_TYPE.platformer

export default function StudioWorkbench() {
  const [gameType, setGameType] = useState<string>(STUDIO_GAME_TYPES[0])
  const [movement, setMovement] = useState<string>(initialLayout.options.movement[0]!)
  const [interaction, setInteraction] = useState<string>(initialLayout.options.interaction[0]!)
  const [behavior, setBehavior] = useState<string>(initialLayout.options.behavior[0]!)
  const [rules, setRules] = useState<string>(initialLayout.options.rules[0]!)
  const [visualStyle, setVisualStyle] = useState<string>(initialLayout.options.visualStyle[0]!)
  const [audio, setAudio] = useState<string>(initialLayout.options.audio[0]!)

  const [tuning, setTuning] = useState<StudioTuning>(DEFAULT_STUDIO_TUNING)
  const [activePanel, setActivePanel] = useState<StudioPanelId>(null)

  const layout = useMemo(() => layoutForGameTypeLabel(gameType), [gameType])

  useEffect(() => {
    const L = layoutForGameTypeLabel(gameType)
    setMovement((m) =>
      L.visiblePanels.includes("movement")
        ? clampToOptions(m, L.options.movement)
        : (L.hiddenDefaults.movement ?? m),
    )
    setInteraction((v) =>
      L.visiblePanels.includes("interaction")
        ? clampToOptions(v, L.options.interaction)
        : (L.hiddenDefaults.interaction ?? v),
    )
    setBehavior((v) =>
      L.visiblePanels.includes("behavior")
        ? clampToOptions(v, L.options.behavior)
        : (L.hiddenDefaults.behavior ?? v),
    )
    setRules((v) =>
      L.visiblePanels.includes("rules")
        ? clampToOptions(v, L.options.rules)
        : (L.hiddenDefaults.rules ?? v),
    )
    setVisualStyle((v) =>
      L.visiblePanels.includes("visualStyle")
        ? clampToOptions(v, L.options.visualStyle)
        : (L.hiddenDefaults.visualStyle ?? v),
    )
    setAudio((v) =>
      L.visiblePanels.includes("audio")
        ? clampToOptions(v, L.options.audio)
        : (L.hiddenDefaults.audio ?? v),
    )
    setActivePanel((p) => {
      if (p === null || p === "gameType") return p
      if (L.visiblePanels.includes(p as StudioModuleField)) return p
      return null
    })
  }, [gameType])

  const modules: ModuleSelectionState = useMemo(
    () => ({
      gameType,
      movement,
      interaction,
      behavior,
      rules,
      visualStyle,
      audio,
    }),
    [audio, behavior, gameType, interaction, movement, rules, visualStyle],
  )

  const baseConfig = useMemo(() => gameConfigFromModuleSelection(modules), [modules])

  const mergedConfig = useMemo(
    () => applyStudioTuning(baseConfig, tuning),
    [baseConfig, tuning],
  )

  const [debouncedConfig, setDebouncedConfig] = useState(mergedConfig)
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedConfig(mergedConfig), 200)
    return () => window.clearTimeout(t)
  }, [mergedConfig])

  const layoutSeed = useMemo(() => {
    const key = JSON.stringify({
      gameType,
      movement,
      interaction,
      behavior,
      rules,
      visualStyle,
      audio,
    })
    return `studio-${hashStringToUint32(key).toString(16)}`
  }, [behavior, gameType, interaction, movement, rules, visualStyle, audio])

  const segmentedPrompt = useMemo(() => {
    const ch = challengeLabel(tuning.challenge)
    const tail = buildPromptFragmentsFromLayout(layout, {
      movement,
      interaction,
      behavior,
      rules,
      visualStyle,
      audio,
    })
    return [gameType, ch, ...tail].join(", ")
  }, [
    audio,
    behavior,
    gameType,
    interaction,
    layout,
    movement,
    rules,
    tuning.challenge,
    visualStyle,
  ])

  const tuningSlider = (
    key: keyof StudioTuning,
    label: string,
    description: string,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="font-mono text-[10px] text-muted-foreground">{tuning[key]}</span>
      </div>
      <Slider
        value={[tuning[key]]}
        min={0}
        max={100}
        step={1}
        onValueChange={(v) => setTuning((prev) => ({ ...prev, [key]: v[0] ?? 0 }))}
        aria-label={label}
      />
      <p className="text-[11px] leading-snug text-muted-foreground">{description}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,288px)_minmax(0,1fr)_minmax(0,272px)] xl:items-start xl:gap-6">
      {/* LEFT — Modules */}
      <aside className="order-2 flex min-h-0 w-full flex-col gap-3 xl:order-none xl:max-h-[min(78vh,820px)]">
        <div className="flex items-center gap-2 px-1">
          <Gamepad2 className="h-4 w-4 text-primary" />
          <h3 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Modules
          </h3>
        </div>
        <ScrollArea className="h-[min(78vh,820px)] pr-3 xl:h-auto xl:max-h-[min(78vh,820px)]">
          <div className="flex flex-col gap-3 pb-2">
            <ModuleOptionCard
              label="Game Type"
              options={STUDIO_GAME_TYPES}
              selected={gameType}
              onPick={setGameType}
              id="gameType"
              activePanel={activePanel}
              onActivatePanel={setActivePanel}
            />
            {layout.visiblePanels.map((field) => {
              const opts = layout.options[field]
              const id = field
              const selected =
                field === "movement"
                  ? movement
                  : field === "interaction"
                    ? interaction
                    : field === "behavior"
                      ? behavior
                      : field === "rules"
                        ? rules
                        : field === "visualStyle"
                          ? visualStyle
                          : audio
              const onPick =
                field === "movement"
                  ? setMovement
                  : field === "interaction"
                    ? setInteraction
                    : field === "behavior"
                      ? setBehavior
                      : field === "rules"
                        ? setRules
                        : field === "visualStyle"
                          ? setVisualStyle
                          : setAudio
              return (
                <ModuleOptionCard
                  key={field}
                  label={studioFieldLabel(field)}
                  options={opts}
                  selected={selected}
                  onPick={onPick}
                  id={id}
                  activePanel={activePanel}
                  onActivatePanel={setActivePanel}
                />
              )
            })}
          </div>
        </ScrollArea>
      </aside>

      {/* CENTER — Live preview */}
      <section className="order-1 flex w-full min-w-0 flex-col gap-4 xl:order-none">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <MonitorPlay className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                Live preview
              </h3>
              <p className="text-xs text-muted-foreground">
                Playable Phaser view · updates ~200ms after you change modules or sliders
              </p>
            </div>
          </div>
        </div>

        <StudioLivePreview config={debouncedConfig} layoutSeed={layoutSeed} />

        <div className="rounded-xl border border-white/10 bg-card/40 p-4 backdrop-blur-md">
          <div className="relative flex flex-col gap-3 md:flex-row md:items-center">
            <Terminal className="absolute left-3 top-3 h-5 w-5 text-primary/70 md:static md:mr-0" />
            <Input
              value={segmentedPrompt}
              readOnly
              data-igraverse-prompt
              data-game-config={JSON.stringify(mergedConfig)}
              placeholder="Describe the game you want to build..."
              className="min-h-14 border-none bg-transparent pl-10 text-base focus-visible:ring-0 md:min-h-16 md:flex-1 md:pl-4"
            />
            <Button
              type="button"
              className="h-12 shrink-0 rounded-xl px-8 text-base font-semibold shadow-[0_0_20px_rgba(0,212,255,0.35)] md:h-14"
            >
              Generate Game
            </Button>
          </div>
        </div>
      </section>

      {/* RIGHT — Tuning */}
      <aside className="order-3 flex w-full flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <SlidersHorizontal className="h-4 w-4 text-secondary" />
          <h3 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Tuning
          </h3>
        </div>
        <Card className="border bg-card/85 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display uppercase tracking-wide">
              Feel & pressure
            </CardTitle>
            <CardDescription className="text-xs">
              {activePanel && PANEL_HINTS[activePanel]}
              {!activePanel && (
                <span className="text-muted-foreground">
                  Select a module on the left for context tips — sliders always apply to the live preview
                  and exported config.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {tuningSlider(
              "challenge",
              "Challenge (speed · jump · gravity)",
              "Low = forgiving physics; high = snappier jumps and heavier gravity.",
            )}
            {tuningSlider(
              "enemyPressure",
              "Enemy rate",
              "Pushes spawn density for bridges, waves, or arena crowds.",
            )}
            {tuningSlider(
              "platformRichness",
              "Platform / layout density",
              "More platforms and bridges in side-scrollers; still influences procedural spacing elsewhere.",
            )}
            {tuningSlider(
              "worldScale",
              "World scale",
              "Compact courses vs longer runs and larger arenas.",
            )}
          </CardContent>
        </Card>

        <Card className="border border-dashed border-primary/20 bg-primary/5">
          <CardContent className="flex gap-3 py-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Preview keeps a stable layout seed for your current game type and visible modules so sliders
              tune feel without reshuffling; switching Game Type updates modules and rolls a new layout.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
