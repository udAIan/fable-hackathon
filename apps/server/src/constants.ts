// Keep the sandbox alive for the length of a working session. On timeout the
// sandbox pauses (see Sandbox.create lifecycle) and auto-resumes on reconnect.
export const STUDIO_SANDBOX_TIMEOUT_MS = 45 * 60 * 1000;

// Upper bound for a single agent run.
export const STUDIO_COMMAND_TIMEOUT_MS = 30 * 60 * 1000;

// Name of the E2B template built by scripts/build-studio-template.ts.
export const STUDIO_TEMPLATE = "claude-studio";

// Agent's working directory inside the sandbox (the workspace root).
export const STUDIO_PROJECT_ROOT = "/home/user";

// The Vite preview app lives here, under the workspace.
export const STUDIO_APP_DIR = "/home/user/app";

// Port the preview dev server (and its E2B public host) runs on.
export const STUDIO_PREVIEW_PORT = 5175;
