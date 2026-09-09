import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email"),
  avatarEmoji: text("avatar_emoji").notNull().default("🦊"),
  avatarGradient: text("avatar_gradient").notNull().default("from-violet-500 to-fuchsia-500"),
  level: text("level").notNull().default("A2 · Explorer"),
  targetLanguages: text("target_languages").notNull().default("Inglês"),
  xp: integer("xp").notNull().default(0),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const checkins = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    dateKey: text("date_key").notNull(),
    xpEarned: integer("xp_earned").notNull().default(20),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("checkins_user_date_uidx").on(t.userId, t.dateKey)]
);

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  language: text("language").notNull().default("Inglês"),
  languageFlag: text("language_flag").notNull().default("🇺🇸"),
  level: text("level").notNull().default("A1"),
  durationMin: integer("duration_min").notNull().default(15),
  xp: integer("xp").notNull().default(30),
  orderNum: integer("order_num").notNull().default(0),
  tag: text("tag").notNull().default("Vocabulário"),
  emoji: text("emoji").notNull().default("📚"),
  gradient: text("gradient").notNull().default("from-sky-500 to-indigo-600"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessonCompletions = pgTable(
  "lesson_completions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    lessonId: integer("lesson_id").notNull(),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("lesson_completions_uidx").on(t.userId, t.lessonId)]
);

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  visibility: text("visibility").notNull().default("public"),
  languageTag: text("language_tag"),
  prompt: text("prompt"),
  imageEmoji: text("image_emoji"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reactions = pgTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull(),
    userId: integer("user_id").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reactions_uidx").on(t.postId, t.userId, t.kind)]
);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const liveEvents = pgTable("live_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  host: text("host").notNull(),
  hostRole: text("host_role").notNull().default("Teacher"),
  hostEmoji: text("host_emoji").notNull().default("🧑‍🏫"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  language: text("language").notNull().default("Inglês"),
  languageFlag: text("language_flag").notNull().default("🇺🇸"),
  level: text("level").notNull().default("Todos os níveis"),
  spotsTotal: integer("spots_total").notNull().default(50),
  description: text("description").notNull().default(""),
  tag: text("tag").notNull().default("Conversation Club"),
  gradient: text("gradient").notNull().default("from-orange-500 to-pink-600"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reservations = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    userId: integer("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reservations_uidx").on(t.eventId, t.userId)]
);

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  xp: integer("xp").notNull().default(50),
  weekLabel: text("week_label").notNull().default("2026-W37"),
  iconEmoji: text("icon_emoji").notNull().default("🎯"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const challengeProgress = pgTable(
  "challenge_progress",
  {
    id: serial("id").primaryKey(),
    challengeId: integer("challenge_id").notNull(),
    userId: integer("user_id").notNull(),
    done: boolean("done").notNull().default(false),
    completedAt: timestamp("completed_at"),
  },
  (t) => [uniqueIndex("challenge_progress_uidx").on(t.challengeId, t.userId)]
);

export const weeklyPhrases = pgTable("weekly_phrases", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  translation: text("translation").notNull().default(""),
  pronunciation: text("pronunciation").notNull().default(""),
  author: text("author").notNull().default(""),
  context: text("context").notNull().default(""),
  weekLabel: text("week_label").notNull().default("2026-W37"),
  language: text("language").notNull().default("Inglês"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyPrompts = pgTable("daily_prompts", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  hint: text("hint").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type LiveEvent = typeof liveEvents.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type WeeklyPhrase = typeof weeklyPhrases.$inferSelect;
