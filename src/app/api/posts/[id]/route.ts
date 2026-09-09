import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts, reactions, comments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId") || "1");
  const rows = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (rows[0].userId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await db.execute(sql`delete from reactions where post_id = ${postId}`);
  await db.execute(sql`delete from comments where post_id = ${postId}`);
  await db.delete(posts).where(eq(posts.id, postId));
  return NextResponse.json({ ok: true });
}
