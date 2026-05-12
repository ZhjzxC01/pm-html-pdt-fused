import { readFile } from "node:fs/promises";
import path from "node:path";

export class PromptRegistry {
  constructor(private readonly promptDir: string = path.resolve(process.cwd(), "prompts")) {}

  async load(name: string): Promise<string> {
    return readFile(path.join(this.promptDir, `${name}.md`), "utf8");
  }
}
