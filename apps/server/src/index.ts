import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { env } from "./env";
import { projectsRouter } from "./routes/projects/index";

const app = express();

const corsOrigin =
  env.WEB_ORIGIN === "*"
    ? true
    : env.WEB_ORIGIN.split(",").map(origin => origin.trim());

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/projects", projectsRouter);

const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(error);
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
