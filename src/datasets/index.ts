import type { DatasetModule } from "./_shared/types";
import { generate as tiendavivaGenerate } from "./tiendaviva/generate";
import { verify as tiendavivaVerify } from "./tiendaviva/verify";

/** Registry of dataset generators. Snapshots are built by `npm run datasets:build`. */
export const datasetModules: Record<string, DatasetModule> = {
  tiendaviva: { generate: tiendavivaGenerate, verify: tiendavivaVerify },
};
