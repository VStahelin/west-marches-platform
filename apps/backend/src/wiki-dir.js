import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const wikiDir = path.resolve(__dirname, "../wiki");

fs.mkdirSync(wikiDir, { recursive: true });
