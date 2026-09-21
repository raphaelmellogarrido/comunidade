import { Router } from "express";
import { db } from "../db";
import { reservations } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const userId = Number(req.query.userId || "1");
  const rows = await db.execute(sql`
    select e.*, (select count(*)::int from reservations r where r.event_id = e.id) as "reservedCount",
      exists(select 1 from reservations r where r.event_id = e.id and r.user_id = ${userId}) as "myReserved"
    from live_events e order by e.starts_at asc
  `);
  res.json({ events: rows.rows });
});

router.post("/:id/reserve", async (req, res) => {
  const eventId = Number(req.params.id);
  const body = req.body || {};
  const userId = Number(body.userId || 1);
  const existing = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.eventId, eventId), eq(reservations.userId, userId)))
    .limit(1);
  if (existing.length) {
    await db.delete(reservations).where(and(eq(reservations.eventId, eventId), eq(reservations.userId, userId)));
    res.json({ ok: true, reserved: false });
    return;
  }
  await db.insert(reservations).values({ eventId, userId }).onConflictDoNothing();
  res.json({ ok: true, reserved: true });
});

export default router;
