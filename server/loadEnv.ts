import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This file lives in server/ (dev) or is bundled into dist/ (production). Project root is one level up.
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, "server", ".env"), override: true });
