import { NextResponse } from "next/server";
import { db } from "@/db";
import { reactions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId || 1);
  const kind = String(body.kind || "heart");
  if (!["heart", "fire", "clap"].includes(kind)) return NextResponse.json({ error: "bad kind" }, { status: 400 });

  const existing = await db.select().from(reactions).where(and(eq(reactions.postId, postId), eq(reactions.userId, userId), eq(reactions.kind, kind))).limit(1);
  if (existing.length) {
    await db.delete(reactions).where(and(eq(reactions.postId, postId), eq(reactions.userId, userId), eq(reactions.kind, kind)));
  } else {
    await db.insert(reactions).values({ postId, userId, kind }).onConflictDoNothing();
    await db.execute(sql`update users set xp = xp + 2 where id = ${userId}`);
  }
  const counts = await db.execute(sql`select kind, count(*)::int as c from reactions where post_id=${postId} group by kind`);
  return NextResponse.json({ ok: true, toggled: existing.length === 0 ? "off" : "on", counts: counts.rows });
}
