import OpenAI from "openai";

import { gameConfigSchema, type GameConfigDTO } from "./gameConfigSchema";

const SYSTEM = `You are a game design assistant for a small browser game engine.
The user describes what they want. You output ONE JSON object only (no markdown, no prose) with exactly these keys and string values from the allowed sets:

- gameType: "platformer" | "top_down_arena" | "retro_shooter"
  - platformer: jump-and-collect on platforms
  - top_down_arena: twin-stick style arena (move + shoot in any direction)
  - retro_shooter: vertical arcade shmup (enemies descend, shoot upward)
- theme: "cyberpunk" | "forest" | "desert" | "cartoon"
- difficulty: "easy" | "medium" | "hard"
- enemyType: "drones" | "aliens" | "robots"
- enemyDensity: "low" | "medium" | "high"
- platformDensity: "low" | "medium" | "high" (meaningful for platformer; still seeds variety for arena/shooter)
- levelSize: "small" | "medium" | "large"

Interpret the user's intent: match mood, pacing, and genre words to the closest valid combination. Prefer variety when the prompt is vague. If optional UI hints are included, treat them as soft suggestions only; the natural-language request takes priority.`;

function getApiKey(): string | undefined {
  const k =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.openai_api_key?.trim();
  return k || undefined;
}

function makeClient(): OpenAI | null {
  const key = getApiKey();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export async function generateGameConfigFromPrompt(
  userPrompt: string,
): Promise<GameConfigDTO> {
  const openai = makeClient();
  if (!openai) {
    const err = new Error(
      "AI game generation is not configured (set OPENAI_API_KEY or openai_api_key in igraverse/.env or igraverse/server/.env)",
    ) as Error & {
      status?: number;
    };
    err.status = 503;
    throw err;
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_GAME_MODEL?.trim() || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    const err = new Error("Empty response from model") as Error & { status?: number };
    err.status = 502;
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    const err = new Error("Model returned invalid JSON") as Error & { status?: number };
    err.status = 502;
    throw err;
  }

  const result = gameConfigSchema.safeParse(parsed);
  if (!result.success) {
    const err = new Error("Model output failed validation") as Error & { status?: number };
    err.status = 502;
    throw err;
  }

  return result.data;
}
