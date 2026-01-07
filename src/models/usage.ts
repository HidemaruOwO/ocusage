export interface UsageSummary {
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  inputCost: number;
  outputCost: number;
  cacheCost: number;
  totalCost: number;
}

export const createEmptyUsageSummary = (): UsageSummary => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheTokens: 0,
  inputCost: 0,
  outputCost: 0,
  cacheCost: 0,
  totalCost: 0,
});

export const mergeUsageSummaries = (
  a: UsageSummary,
  b: UsageSummary,
): UsageSummary => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  cacheTokens: a.cacheTokens + b.cacheTokens,
  inputCost: a.inputCost + b.inputCost,
  outputCost: a.outputCost + b.outputCost,
  cacheCost: a.cacheCost + b.cacheCost,
  totalCost: a.totalCost + b.totalCost,
});
