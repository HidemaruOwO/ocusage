const addCommas = (value: string): string => {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const formatTokens = (count: number): string => {
  const sign = count < 0 ? "-" : "";
  const [intPart, fracPart] = Math.abs(count).toString().split(".");
  const formattedInt = addCommas(intPart);

  if (!fracPart) return `${sign}${formattedInt}`;
  return `${sign}${formattedInt}.${fracPart}`;
};

export const formatCost = (cost: number): string => {
  return `$${cost.toFixed(4)}`;
};

export const formatDuration = (minutes: number): string => {
  return `${minutes}min`;
};

export const formatTable = (headers: string[], rows: string[][]): string => {
  const lines: string[] = [];

  if (headers.length > 0) {
    lines.push(headers.join("\t"));
  }

  for (const row of rows) {
    lines.push(row.join("\t"));
  }

  return lines.join("\n");
};
