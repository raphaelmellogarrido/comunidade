import { Router } from "express";
import { db } from "../db";
import { posts, comments, reactions } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const userId = Number(req.query.userId || "1");
  const filter = String(req.query.lang || "all");

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
  res.json({ posts: rows.rows });
});

router.post("/", async (req, res) => {
  const body = req.body || {};
  const userId = Number(body.userId || 1);
  const content = String(body.content || "").trim();
  if (!content) {
    res.status(400).json({ error: "empty" });
    return;
  }
  const visibility = String(body.visibility || "public");
  const languageTag = body.languageTag ? String(body.languageTag) : null;
  const prompt = body.prompt ? String(body.prompt) : null;
  const inserted = await db
    .insert(posts)
    .values({ userId, content: content.slice(0, 600), visibility, languageTag, prompt })
    .returning();
  await db.execute(sql`update users set xp = xp + 10 where id = ${userId}`);
  res.json({ ok: true, post: inserted[0] });
});

router.delete("/:id", async (req, res) => {
  const postId = Number(req.params.id);
  const userId = Number(req.query.userId || "1");
  const rows = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!rows.length) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (rows[0].userId !== userId) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  await db.execute(sql`delete from reactions where post_id = ${postId}`);
  await db.execute(sql`delete from comments where post_id = ${postId}`);
  await db.delete(posts).where(eq(posts.id, postId));
  res.json({ ok: true });
});

router.get("/:id/comments", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.execute(sql`
    select c.id, c.content, c.created_at as "createdAt", u.id as "userId", u.name as "userName", u.avatar_emoji as "avatarEmoji", u.avatar_gradient as "avatarGradient", u.level as "userLevel"
    from comments c join users u on u.id = c.user_id
    where c.post_id = ${id} order by c.created_at asc limit 50
  `);
  res.json({ comments: rows.rows });
});

router.post("/:id/comments", async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const userId = Number(body.userId || 1);
  const content = String(body.content || "").trim();
  if (!content) {
    res.status(400).json({ error: "empty" });
    return;
  }
  const inserted = await db
    .insert(comments)
    .values({ postId: id, userId, content: content.slice(0, 300) })
    .returning();
  await db.execute(sql`update users set xp = xp + 5 where id = ${userId}`);
  res.json({ ok: true, comment: inserted[0] });
});

router.post("/:id/react", async (req, res) => {
  const postId = Number(req.params.id);
  const body = req.body || {};
  const userId = Number(body.userId || 1);
  const kind = String(body.kind || "heart");
  if (!["heart", "fire", "clap"].includes(kind)) {
    res.status(400).json({ error: "bad kind" });
    return;
  }

  const existing = await db
    .select()
    .from(reactions)
    .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId), eq(reactions.kind, kind)))
    .limit(1);
  if (existing.length) {
    await db
      .delete(reactions)
      .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId), eq(reactions.kind, kind)));
  } else {
    await db.insert(reactions).values({ postId, userId, kind }).onConflictDoNothing();
    await db.execute(sql`update users set xp = xp + 2 where id = ${userId}`);
  }
  const counts = await db.execute(sql`select kind, count(*)::int as c from reactions where post_id=${postId} group by kind`);
  res.json({ ok: true, toggled: existing.length === 0 ? "off" : "on", counts: counts.rows });
});

export default router;
