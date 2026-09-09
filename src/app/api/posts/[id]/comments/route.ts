import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.execute(sql`
    select c.id, c.content, c.created_at as "createdAt", u.id as "userId", u.name as "userName", u.avatar_emoji as "avatarEmoji", u.avatar_gradient as "avatarGradient", u.level as "userLevel"
    from comments c join users u on u.id = c.user_id
    where c.post_id = ${Number(id)} order by c.created_at asc limit 50
  `);
  return NextResponse.json({ comments: rows.rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId || 1);
  const content = String(body.content || "").trim();
  if (!content) return NextResponse.json({ error: "empty" }, { status: 400 });
  const inserted = await db.insert(comments).values({ postId: Number(id), userId, content: content.slice(0, 300) }).returning();
  await db.execute(sql`update users set xp = xp + 5 where id = ${userId}`);
  return NextResponse.json({ ok: true, comment: inserted[0] });
}
