"use client";

import { WebContainer } from "@webcontainer/api";

let instance: WebContainer | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (instance) return instance;
  instance = await WebContainer.boot();
  return instance;
}

export async function mountFiles(
  files: Record<string, string>
): Promise<WebContainer> {
  const wc = await getWebContainer();
  const tree: any = {};
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split("/");
    let current = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = { directory: {} };
      current = current[part].directory;
    }
    const fileName = parts[parts.length - 1];
    current[fileName] = { file: { contents: content } };
  }
  await wc.mount(tree);
  return wc;
}

export async function startDevServer(wc: WebContainer): Promise<string> {
  const install = await wc.spawn("npm", ["install"]);
  await install.exit;
  await wc.spawn("npm", ["run", "dev"]);
  return new Promise((resolve) => {
    wc.on("server-ready", (port, url) => {
      resolve(url);
    });
  });
}
