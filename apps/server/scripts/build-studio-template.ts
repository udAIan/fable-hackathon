import "dotenv/config";
import { Template, defaultBuildLogger } from "e2b";

// Builds the E2B sandbox template used by every studio project. Run manually:
//   pnpm build:studio-template            (from apps/server)
//   pnpm --filter server build:studio-template   (from the repo root)
//
// The template ships Node + pnpm + the Claude Code CLI + ffmpeg. The agent's
// workspace is /home/user, with a minimal Vite React app at /home/user/app (the
// live preview), plus /home/user/media (agent output) and /home/user/inputs (user
// uploads), both bridged into the app for serving. Claude Code authenticates at
// runtime via the ANTHROPIC_API_KEY passed into each command.

const e2bApiKey = process.env.E2B_API_KEY?.trim();
if (!e2bApiKey) {
  throw new Error("E2B_API_KEY is required to build the studio template");
}

// Latest static ffmpeg + ffprobe (BtbN shared build) for the video pipeline.
const ffmpegSharedArchiveUrl =
  "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n8.1-latest-linux64-gpl-shared-8.1.tar.xz";

const template = Template({
  fileContextPath: ".",
  fileIgnorePatterns: ["**/node_modules/**", "**/dist/**"],
})
  .fromImage("node:22")
  .runCmd("corepack enable", { user: "root" })
  .runCmd("corepack prepare pnpm@10.1.0 --activate", { user: "root" })
  .runCmd("npm install -g @anthropic-ai/claude-code@latest", { user: "root" })
  // Latest ffmpeg/ffprobe (shared build) — used for all local media work.
  .runCmd(
    `mkdir -p /opt/ffmpeg && curl -L --fail ${ffmpegSharedArchiveUrl} | tar -xJ -C /opt/ffmpeg --strip-components=1 && ln -sf /opt/ffmpeg/bin/ffmpeg /usr/local/bin/ffmpeg && ln -sf /opt/ffmpeg/bin/ffprobe /usr/local/bin/ffprobe && echo /opt/ffmpeg/lib > /etc/ld.so.conf.d/btbn-ffmpeg.conf && ldconfig`,
    { user: "root" },
  )
  .copy("project-scaffold", "/home/user")
  .runCmd("chown -R user:user /home/user", { user: "root" })
  // Bridge the workspace media + inputs dirs into the app's public dir so the
  // preview can fetch them at /media/... and /inputs/...
  .runCmd(
    "mkdir -p /home/user/app/public && ln -sfn ../../media /home/user/app/public/media && ln -sfn ../../inputs /home/user/app/public/inputs",
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
  cpuCount: 4,
  memoryMB: 8192,
  onBuildLogs: defaultBuildLogger(),
});

// eslint-disable-next-line no-console
console.log(
  `Built E2B template ${buildInfo.name} with build ID ${buildInfo.buildId}`,
);
