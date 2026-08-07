export function extractFileErrors(tscOutput: string): Map<string, string[]> {
  const fileErrors = new Map<string, string[]>();
  const lines = tscOutput.split("\n");

  for (const line of lines) {
    const match = line.match(/^(.+?\.tsx?)\(\d+,\d+\):\s*(error.+)$/);
    if (match) {
      const [, file, error] = match;
      const cleanFile = file.trim();
      if (!fileErrors.has(cleanFile)) {
        fileErrors.set(cleanFile, []);
      }
      fileErrors.get(cleanFile)!.push(error.trim());
    }
  }

  return fileErrors;
}

export function extractBuildFileErrors(buildOutput: string): Map<string, string[]> {
  const fileErrors = new Map<string, string[]>();
  const lines = buildOutput.split("\n");
  let lastErrorMessage = "";

  for (const line of lines) {
    const errorLine = line.match(/^Error occurred prerendering page.*|^Error:\s*(.+)$/);
    if (errorLine) {
      lastErrorMessage = line.trim();
      continue;
    }
    const locationMatch = line.match(/\(((?:src|prisma)\/[^\s:]+\.tsx?):(\d+):(\d+)\)/);
    if (locationMatch) {
      const file = locationMatch[1];
      if (!fileErrors.has(file)) fileErrors.set(file, []);
      fileErrors.get(file)!.push(lastErrorMessage || "Erreur de build Next.js");
    }
  }

  return fileErrors;
}
