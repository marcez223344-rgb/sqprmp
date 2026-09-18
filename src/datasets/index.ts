import type { DatasetModule } from "./_shared/types";
import { generate as tiendavivaGenerate } from "./tiendaviva/generate";
import { verify as tiendavivaVerify } from "./tiendaviva/verify";
import { generate as bolsilloGenerate } from "./bolsillo/generate";
import { verify as bolsilloVerify } from "./bolsillo/verify";
import { generate as pideloGenerate } from "./pidelo/generate";
import { verify as pideloVerify } from "./pidelo/verify";

/** Registry of dataset generators. Snapshots are built by `npm run datasets:build`. */
export const datasetModules: Record<string, DatasetModule> = {
  tiendaviva: { generate: tiendavivaGenerate, verify: tiendavivaVerify },
  bolsillo: { generate: bolsilloGenerate, verify: bolsilloVerify },
  pidelo: { generate: pideloGenerate, verify: pideloVerify },
};
