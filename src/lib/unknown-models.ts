import { consola } from "consola";
import { getUnknownModels } from "@/services/cost";

export const printUnknownModelsSummary = (showDetails: boolean): void => {
  const unknowns = getUnknownModels();
  if (unknowns.length === 0) return;

  const count = unknowns.length;
  const plural = count === 1 ? "model" : "models";

  if (showDetails) {
    consola.info(`Found ${count} unknown ${plural} (cost set to $0):`);
    for (const model of unknowns.sort()) {
      console.log(`  - ${model}`);
    }
    return;
  }

  consola.info(
    `Found ${count} unknown ${plural} (cost set to $0). Use --show-unknown to see details.`,
  );
};
