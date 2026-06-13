import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { env } from "./env";
import { projectsRouter } from "./routes/projects/index";

const app = express();

const allowedOrigins =
  env.WEB_ORIGIN === "*"
    ? null
    : env.WEB_ORIGIN.split(",").map(origin => origin.trim());

app.use(
  cors({
    // Allow the configured web origin(s), plus any sandbox preview host
    // (*.e2b.app) so the agent-built preview can call back to start jobs.
    origin: (origin, callback) => {
      if (!origin || origin.endsWith(".e2b.app")) return callback(null, true);
      if (!allowedOrigins || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  }),
);
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/projects", projectsRouter);

const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  if (res.headersSent) return;
  res.status(500).json({
    error: "Internal Server Error",
    message: "Something went wrong",
  });
};

app.use(errorMiddleware);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Studio server running on http://localhost:${env.PORT}`);
});
