import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("userId") || "1");
  const rows = await db.select().from(users).where(eq(users.id, Number.isFinite(id) ? id : 1)).limit(1);
  if (!rows.length) return NextResponse.json({ error: "user not found" }, { status: 404 });
  return NextResponse.json({ user: rows[0] });
}
