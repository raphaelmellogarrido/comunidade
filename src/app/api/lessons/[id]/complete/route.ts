import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessonCompletions, lessons, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lessonId = Number(id);
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId || 1);
  const existing = await db.select().from(lessonCompletions).where(and(eq(lessonCompletions.lessonId, lessonId), eq(lessonCompletions.userId, userId))).limit(1);
  if (existing.length) return NextResponse.json({ ok: true, already: true });
  await db.insert(lessonCompletions).values({ lessonId, userId }).onConflictDoNothing();
  const l = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  const xp = l[0]?.xp ?? 30;
  await db.execute(sql`update users set xp = xp + ${xp} where id = ${userId}`);
  return NextResponse.json({ ok: true, xp });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lessonId = Number(id);
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId") || "1");
  await db.delete(lessonCompletions).where(and(eq(lessonCompletions.lessonId, lessonId), eq(lessonCompletions.userId, userId)));
  return NextResponse.json({ ok: true });
}
