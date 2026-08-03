import fs from "fs";
import path from "path";

const HISTORY_FILE = "/home/ubuntu/zovo-generated-projects/history.json";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  prompt: string;
  projectPath: string;
  features: string[];
  userId?: string;
}

export class GenerationHistory {

  private readAll(): HistoryEntry[] {
    if (!fs.existsSync(HISTORY_FILE)) {
      return [];
    }
    try {
      const content = fs.readFileSync(HISTORY_FILE, "utf-8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  add(entry: Omit<HistoryEntry, "id" | "timestamp">): HistoryEntry {
    const all = this.readAll();

    const newEntry: HistoryEntry = {
      id: `gen-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    all.unshift(newEntry);

    // Garde les 100 dernières générations max
    const trimmed = all.slice(0, 100);

    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), "utf-8");

    return newEntry;
  }

  getAll(): HistoryEntry[] {
    return this.readAll();
  }
}

const generationhistoryInstance = new GenerationHistory();
export default generationhistoryInstance;
