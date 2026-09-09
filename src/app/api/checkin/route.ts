import { NextResponse } from "next/server";
import { db } from "@/db";
import { checkins, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId || 1);
  const todayKey = new Date().toISOString().slice(0, 10);
  try {
    await db.insert(checkins).values({ userId, dateKey: todayKey, xpEarned: 20 }).onConflictDoNothing();
    await db.execute(sql`update users set xp = xp + 20 where id = ${userId}`);
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return NextResponse.json({ ok: true, user: rows[0], dateKey: todayKey });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
