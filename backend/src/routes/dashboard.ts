import { Router } from "express";
import { db } from "../db";
import {
  users,
  checkins,
  lessons,
  lessonCompletions,
  liveEvents,
  reservations,
  challenges,
  challengeProgress,
  weeklyPhrases,
  dailyPrompts,
} from "../db/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";

const router = Router();

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // monday=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

router.get("/", async (req, res) => {
  const userId = Number(req.query.userId || "1");

  const meRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const me = meRows[0] ?? (await db.select().from(users).limit(1))[0];
  if (!me) {
    res.status(404).json({ error: "no users, seed first" });
    return;
  }
  const uid = me.id;

  const today = new Date();
  const todayKey = dateKey(today);

  // my checkins
  const myCheckins = await db.select().from(checkins).where(eq(checkins.userId, uid));
  const myDates = new Set(myCheckins.map((c) => c.dateKey));
  const checkedToday = myDates.has(todayKey);

  // streak: count back from today (or yesterday if not checked today)
  let streak = 0;
  const cursor = new Date(today);
  if (!myDates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (myDates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 365) break;
  }

  // week dots Mon..Sun
  const monday = startOfWeekMonday(today);
  const weekDays: { key: string; label: string; done: boolean; isToday: boolean }[] = [];
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() - 1);
  const ptLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const k = dateKey(d);
    weekDays.push({ key: k, label: ptLabels[i], done: myDates.has(k), isToday: k === todayKey });
  }

  // journey
  const allLessons = await db.select().from(lessons).orderBy(lessons.orderNum);
  const myCompletions = await db.select().from(lessonCompletions).where(eq(lessonCompletions.userId, uid));
  const doneIds = new Set(myCompletions.map((c) => c.lessonId));

  // studying together stats
  const todayCountRes = await db.execute(sql`select count(*)::int as c from checkins where date_key = ${todayKey}`);
  const studiedToday = (todayCountRes.rows[0] as { c: number })?.c ?? 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sharesTodayRes = await db.execute(sql`select count(*)::int as c from posts where created_at >= ${todayStart.toISOString()}`);
  const sharesToday = (sharesTodayRes.rows[0] as { c: number })?.c ?? 0;
  const totalPresenceRes = await db.execute(sql`select count(*)::int as c from checkins`);
  const totalPresence = (totalPresenceRes.rows[0] as { c: number })?.c ?? 0;

  // avatars of who studied today
  const studiedAvatarsRes = await db.execute(sql`
    select u.id, u.name, u.avatar_emoji as "avatarEmoji", u.avatar_gradient as "avatarGradient"
    from checkins c join users u on u.id = c.user_id
    where c.date_key = ${todayKey}
    order by c.created_at desc limit 8
  `);
  const studiedAvatars = studiedAvatarsRes.rows as { id: number; name: string; avatarEmoji: string; avatarGradient: string }[];

  // next event
  const upcoming = await db.select().from(liveEvents).where(gte(liveEvents.startsAt, new Date())).orderBy(liveEvents.startsAt).limit(5);
  const next = upcoming[0] ?? (await db.select().from(liveEvents).orderBy(desc(liveEvents.startsAt)).limit(1))[0] ?? null;
  let reservedCount = 0;
  let myReserved = false;
  let reservedAvatars: { id: number; name: string; avatarEmoji: string; avatarGradient: string }[] = [];
  if (next) {
    const rc = await db.execute(sql`select count(*)::int as c from reservations where event_id = ${next.id}`);
    reservedCount = (rc.rows[0] as { c: number })?.c ?? 0;
    const mine = await db.select().from(reservations).where(and(eq(reservations.eventId, next.id), eq(reservations.userId, uid))).limit(1);
    myReserved = mine.length > 0;
    const av = await db.execute(sql`
      select u.id, u.name, u.avatar_emoji as "avatarEmoji", u.avatar_gradient as "avatarGradient"
      from reservations r join users u on u.id = r.user_id
      where r.event_id = ${next.id} order by r.created_at desc limit 6
    `);
    reservedAvatars = av.rows as typeof reservedAvatars;
  }

  // challenges
  const allChallenges = await db.select().from(challenges).orderBy(challenges.id).limit(8);
  const myProg = await db.select().from(challengeProgress).where(eq(challengeProgress.userId, uid));
  const progMap = new Map(myProg.map((p) => [p.challengeId, p]));
  const challengesOut = allChallenges.map((c) => ({
    ...c,
    done: progMap.get(c.id)?.done ?? false,
  }));

  // phrase
  const phraseRows = await db.select().from(weeklyPhrases).where(eq(weeklyPhrases.active, true)).orderBy(desc(weeklyPhrases.id)).limit(1);
  const phrase = phraseRows[0] ?? null;

  // prompt
  const promptRows = await db.select().from(dailyPrompts).where(eq(dailyPrompts.active, true)).orderBy(dailyPrompts.id).limit(1);
  const prompt = promptRows[0] ?? null;

  // leaderboard top 5 by xp
  const leaders = await db.execute(sql`select id, name, avatar_emoji as "avatarEmoji", avatar_gradient as "avatarGradient", xp, level from users order by xp desc limit 5`);
  // total xp rank of me
  const rankRes = await db.execute(sql`select count(*)::int + 1 as r from users where xp > (select xp from users where id = ${uid})`);
  const myRank = (rankRes.rows[0] as { r: number })?.r ?? 1;

  res.json({
    me,
    streak,
    checkedToday,
    weekDays,
    journey: { total: allLessons.length, done: myCompletions.length, doneIds: [...doneIds], percent: allLessons.length ? Math.round((myCompletions.length / allLessons.length) * 100) : 0 },
    together: { studiedToday, sharesToday, totalPresence, avatars: studiedAvatars },
    nextEvent: next ? { ...next, reservedCount, myReserved, avatars: reservedAvatars, spotsLeft: Math.max(0, next.spotsTotal - reservedCount) } : null,
    upcomingEvents: upcoming,
    challenges: challengesOut,
    phrase,
    prompt,
    leaders: leaders.rows,
    myRank,
    totalMembers: 8,
  });
});

export default router;
