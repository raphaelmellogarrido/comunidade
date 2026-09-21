import { Router } from "express";
import { db } from "../db";
import { challengeProgress, challenges } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const userId = Number(req.query.userId || "1");
  const rows = await db.execute(sql`
    select c.*, coalesce(p.done, false) as done
    from challenges c left join challenge_progress p on p.challenge_id = c.id and p.user_id = ${userId}
    order by c.id asc
  `);
  res.json({ challenges: rows.rows });
});

router.post("/:id/toggle", async (req, res) => {
  const challengeId = Number(req.params.id);
  const body = req.body || {};
  const userId = Number(body.userId || 1);
  const existing = await db
    .select()
    .from(challengeProgress)
    .where(and(eq(challengeProgress.challengeId, challengeId), eq(challengeProgress.userId, userId)))
    .limit(1);
  const ch = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  const xp = ch[0]?.xp ?? 50;
  if (!existing.length) {
    await db
      .insert(challengeProgress)
      .values({ challengeId, userId, done: true, completedAt: new Date() })
      .onConflictDoNothing();
    await db.execute(sql`update users set xp = xp + ${xp} where id = ${userId}`);
    res.json({ ok: true, done: true, xp });
    return;
  }
  const next = !existing[0].done;
  await db
    .update(challengeProgress)
    .set({ done: next, completedAt: next ? new Date() : null })
    .where(and(eq(challengeProgress.challengeId, challengeId), eq(challengeProgress.userId, userId)));
  if (next) await db.execute(sql`update users set xp = xp + ${xp} where id = ${userId}`);
  else await db.execute(sql`update users set xp = greatest(0, xp - ${xp}) where id = ${userId}`);
  res.json({ ok: true, done: next, xp: next ? xp : -xp });
});

export default router;
