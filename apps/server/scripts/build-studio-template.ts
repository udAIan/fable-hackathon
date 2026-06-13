import "dotenv/config";
import { Template, defaultBuildLogger } from "e2b";

// Builds the E2B sandbox template used by every studio project. Run manually:
//   pnpm build:studio-template            (from apps/server)
//   pnpm --filter server build:studio-template   (from the repo root)
//
// The template ships Node + pnpm + the Claude Code CLI. The agent's workspace is
// /home/user, with a minimal Vite React app at /home/user/app (the live preview)
// and a /home/user/media dir bridged into the app for serving. Claude Code
// authenticates at runtime via the ANTHROPIC_API_KEY passed into each command.

const e2bApiKey = process.env.E2B_API_KEY?.trim();
if (!e2bApiKey) {
  throw new Error("E2B_API_KEY is required to build the studio template");
}

const template = Template({
  fileContextPath: ".",
  fileIgnorePatterns: ["**/node_modules/**", "**/dist/**"],
})
  .fromImage("node:22")
  .runCmd("corepack enable", { user: "root" })
  .runCmd("corepack prepare pnpm@10.1.0 --activate", { user: "root" })
  .runCmd("npm install -g @anthropic-ai/claude-code@latest", { user: "root" })
  .copy("project-scaffold", "/home/user")
  .runCmd("chown -R user:user /home/user", { user: "root" })
  // Bridge the workspace media dir into the app's public dir so the preview can
  // fetch generated media at /media/...
  .runCmd(
    "mkdir -p /home/user/app/public && ln -sfn ../../media /home/user/app/public/media",
    { user: "user" },
  )
  .setWorkdir("/home/user/app")
  .runCmd("node --version && pnpm --version && claude --version", {
    user: "user",
  })
  .runCmd("pnpm install", { user: "user" })
  .setWorkdir("/home/user");

const buildInfo = await Template.build(template, "claude-studio", {
  apiKey: e2bApiKey,
  cpuCount: 2,
  memoryMB: 4096,
  onBuildLogs: defaultBuildLogger(),
});

// eslint-disable-next-line no-console
console.log(
  `Built E2B template ${buildInfo.name} with build ID ${buildInfo.buildId}`,
);
