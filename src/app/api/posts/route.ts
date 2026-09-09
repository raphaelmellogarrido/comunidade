import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts, users, reactions, comments } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId") || "1");
  const filter = url.searchParams.get("lang") || "all";

  let rows;
  if (filter === "all") {
    rows = await db.execute(sql`
      select p.id, p.content, p.visibility, p.language_tag as "languageTag", p.prompt, p.image_emoji as "imageEmoji", p.created_at as "createdAt",
        u.id as "userId", u.name as "userName", u.avatar_emoji as "avatarEmoji", u.avatar_gradient as "avatarGradient", u.level as "userLevel",
        (select count(*)::int from reactions r where r.post_id = p.id and r.kind='heart') as hearts,
        (select count(*)::int from reactions r where r.post_id = p.id and r.kind='fire') as fires,
        (select count(*)::int from reactions r where r.post_id = p.id and r.kind='clap') as claps,
        (select count(*)::int from comments c where c.post_id = p.id) as "commentsCount",
        exists(select 1 from reactions r where r.post_id=p.id and r.user_id=${userId} and r.kind='heart') as "reactedHeart",
        exists(select 1 from reactions r where r.post_id=p.id and r.user_id=${userId} and r.kind='fire') as "reactedFire",
        exists(select 1 from reactions r where r.post_id=p.id and r.user_id=${userId} and r.kind='clap') as "reactedClap"
      from posts p join users u on u.id = p.user_id
      where (p.visibility='public' or p.user_id=${userId})
      order by p.created_at desc limit 40
    `);
  } else {
    rows = await db.execute(sql`
      select p.id, p.content, p.visibility, p.language_tag as "languageTag", p.prompt, p.image_emoji as "imageEmoji", p.created_at as "createdAt",
        u.id as "userId", u.name as "userName", u.avatar_emoji as "avatarEmoji", u.avatar_gradient as "avatarGradient", u.level as "userLevel",
        (select count(*)::int from reactions r where r.post_id = p.id and r.kind='heart') as hearts,
        (select count(*)::int from reactions r where r.post_id = p.id and r.kind='fire') as fires,
        (select count(*)::int from reactions r where r.post_id = p.id and r.kind='clap') as claps,
        (select count(*)::int from comments c where c.post_id = p.id) as "commentsCount",
        exists(select 1 from reactions r where r.post_id=p.id and r.user_id=${userId} and r.kind='heart') as "reactedHeart",
        exists(select 1 from reactions r where r.post_id=p.id and r.user_id=${userId} and r.kind='fire') as "reactedFire",
        exists(select 1 from reactions r where r.post_id=p.id and r.user_id=${userId} and r.kind='clap') as "reactedClap"
      from posts p join users u on u.id = p.user_id
      where (p.visibility='public' or p.user_id=${userId}) and p.language_tag = ${filter}
      order by p.created_at desc limit 40
    `);
  }
  return NextResponse.json({ posts: rows.rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId = Number(body.userId || 1);
  const content = String(body.content || "").trim();
  if (!content) return NextResponse.json({ error: "empty" }, { status: 400 });
  const visibility = String(body.visibility || "public");
  const languageTag = body.languageTag ? String(body.languageTag) : null;
  const prompt = body.prompt ? String(body.prompt) : null;
  const inserted = await db.insert(posts).values({ userId, content: content.slice(0, 600), visibility, languageTag, prompt }).returning();
  await db.execute(sql`update users set xp = xp + 10 where id = ${userId}`);
  return NextResponse.json({ ok: true, post: inserted[0] });
}
