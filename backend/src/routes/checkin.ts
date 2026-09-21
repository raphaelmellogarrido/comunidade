import { Router } from "express";
import { db } from "../db";
import { checkins, users } from "../db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  const body = req.body || {};
  const userId = Number(body.userId || 1);
  const todayKey = new Date().toISOString().slice(0, 10);
  try {
    await db.insert(checkins).values({ userId, dateKey: todayKey, xpEarned: 20 }).onConflictDoNothing();
    await db.execute(sql`update users set xp = xp + 20 where id = ${userId}`);
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    res.json({ ok: true, user: rows[0], dateKey: todayKey });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
