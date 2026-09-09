import { NextResponse } from "next/server";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventId = Number(id);
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId || 1);
  const existing = await db.select().from(reservations).where(and(eq(reservations.eventId, eventId), eq(reservations.userId, userId))).limit(1);
  if (existing.length) {
    await db.delete(reservations).where(and(eq(reservations.eventId, eventId), eq(reservations.userId, userId)));
    return NextResponse.json({ ok: true, reserved: false });
  }
  await db.insert(reservations).values({ eventId, userId }).onConflictDoNothing();
  return NextResponse.json({ ok: true, reserved: true });
}
