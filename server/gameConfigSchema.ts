import { z } from "zod";

/** Matches client `GameConfig` — used to validate LLM output server-side. */
export const gameConfigSchema = z.object({
  gameType: z.enum(["platformer", "top_down_arena", "retro_shooter"]),
  theme: z.enum(["cyberpunk", "forest", "desert", "cartoon"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  enemyType: z.enum(["drones", "aliens", "robots"]),
  enemyDensity: z.enum(["low", "medium", "high"]),
  platformDensity: z.enum(["low", "medium", "high"]),
  levelSize: z.enum(["small", "medium", "large"]),
});

export type GameConfigDTO = z.infer<typeof gameConfigSchema>;
