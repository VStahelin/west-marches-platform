import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const quadrantsDir = path.resolve(__dirname, "../quadrants");

fs.mkdirSync(quadrantsDir, { recursive: true });
