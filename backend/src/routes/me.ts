import { Router } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const id = Number(req.query.userId || "1");
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, Number.isFinite(id) ? id : 1))
    .limit(1);
  if (!rows.length) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  res.json({ user: rows[0] });
});

export default router;
