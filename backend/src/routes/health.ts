import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    // Log completo só no servidor (aparece nos logs do Render); a resposta
    // HTTP não expõe a connection string nem detalhes internos do driver.
    console.error("Health check: falha ao conectar no banco de dados:", err);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

export default router;
