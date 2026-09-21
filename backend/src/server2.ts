import "dotenv/config";
import express from "express";
import cors from "cors";

import lessonsRouter from "./routes/lessons";
import postsRouter from "./routes/posts";
import eventsRouter from "./routes/events";
import challengesRouter from "./routes/challenges";
import checkinRouter from "./routes/checkin";
import meRouter from "./routes/me";
import healthRouter from "./routes/health";
import dashboardRouter from "./routes/dashboard";
import seedRouter from "./routes/seed";

const app = express();

const frontendOrigin = process.env.FRONTEND_ORIGIN;
const allowedOrigins = frontendOrigin
  ? frontendOrigin.split(",").map((o) => o.trim())
  : "*";

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use("/api/lessons", lessonsRouter);
app.use("/api/posts", postsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/checkin", checkinRouter);
app.use("/api/me", meRouter);
app.use("/api/health", healthRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/seed", seedRouter);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
});
