import { NextResponse } from "next/server";
import { db } from "@/db";
import { challengeProgress, challenges } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challengeId = Number(id);
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId || 1);
  const existing = await db.select().from(challengeProgress).where(and(eq(challengeProgress.challengeId, challengeId), eq(challengeProgress.userId, userId))).limit(1);
  const ch = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  const xp = ch[0]?.xp ?? 50;
  if (!existing.length) {
    await db.insert(challengeProgress).values({ challengeId, userId, done: true, completedAt: new Date() }).onConflictDoNothing();
    await db.execute(sql`update users set xp = xp + ${xp} where id = ${userId}`);
    return NextResponse.json({ ok: true, done: true, xp });
  }
  const next = !existing[0].done;
  await db.update(challengeProgress).set({ done: next, completedAt: next ? new Date() : null }).where(and(eq(challengeProgress.challengeId, challengeId), eq(challengeProgress.userId, userId)));
  if (next) await db.execute(sql`update users set xp = xp + ${xp} where id = ${userId}`);
  else await db.execute(sql`update users set xp = greatest(0, xp - ${xp}) where id = ${userId}`);
  return NextResponse.json({ ok: true, done: next, xp: next ? xp : -xp });
}
