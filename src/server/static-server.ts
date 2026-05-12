import { readFile } from "node:fs/promises";
import path from "node:path";

const staticContentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml"
};

export async function readStaticAsset(webRoot: string, urlPath: string): Promise<{ content: Buffer; contentType: string }> {
  const normalizedPath = urlPath === "/" ? "/index.html" : urlPath;
  const assetPath = path.join(webRoot, normalizedPath);
  const relative = path.relative(webRoot, assetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("不允许读取 Web 根目录外的文件。");
  }

  const content = await readFile(assetPath);
  return {
    content,
    contentType: staticContentTypes[path.extname(assetPath)] ?? "application/octet-stream"
  };
}
