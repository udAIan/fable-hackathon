import "dotenv/config";

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
};

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  E2B_API_KEY: required("E2B_API_KEY"),
  ANTHROPIC_API_KEY: required("ANTHROPIC_API_KEY"),
  DEEPGRAM_API_KEY: required("DEEPGRAM_API_KEY"),
  FAL_KEY: required("FAL_KEY"),
  STUDIO_AGENT_MODEL: process.env.STUDIO_AGENT_MODEL?.trim() || "opus",
  // Public origin of this server, injected into the sandbox preview so the
  // agent's UI can call back (e.g. to start a lip-sync job).
  STUDIO_PUBLIC_URL:
    process.env.STUDIO_PUBLIC_URL?.trim() || "http://localhost:3001",
  WEB_ORIGIN: process.env.WEB_ORIGIN?.trim() || "*",
  PORT: Number(process.env.PORT) || 3001,
};
