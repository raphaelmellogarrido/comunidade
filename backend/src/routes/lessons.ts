import { Router } from "express";
import { db } from "../db";
import { lessonCompletions, lessons } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const userId = Number(req.query.userId || "1");
  const rows = await db.execute(sql`
    select l.*, exists(select 1 from lesson_completions c where c.lesson_id = l.id and c.user_id = ${userId}) as done
    from lessons l order by l.order_num asc
  `);
  res.json({ lessons: rows.rows });
});

router.post("/:id/complete", async (req, res) => {
  const lessonId = Number(req.params.id);
  const body = req.body || {};
  const userId = Number(body.userId || 1);
  const existing = await db
    .select()
    .from(lessonCompletions)
    .where(and(eq(lessonCompletions.lessonId, lessonId), eq(lessonCompletions.userId, userId)))
    .limit(1);
  if (existing.length) {
    res.json({ ok: true, already: true });
    return;
  }
  await db.insert(lessonCompletions).values({ lessonId, userId }).onConflictDoNothing();
  const l = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  const xp = l[0]?.xp ?? 30;
  await db.execute(sql`update users set xp = xp + ${xp} where id = ${userId}`);
  res.json({ ok: true, xp });
});

router.delete("/:id/complete", async (req, res) => {
  const lessonId = Number(req.params.id);
  const userId = Number(req.query.userId || "1");
  await db
    .delete(lessonCompletions)
    .where(and(eq(lessonCompletions.lessonId, lessonId), eq(lessonCompletions.userId, userId)));
  res.json({ ok: true });
});

export default router;
