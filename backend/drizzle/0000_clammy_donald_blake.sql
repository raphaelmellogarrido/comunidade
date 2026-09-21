CREATE TABLE "challenge_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"xp" integer DEFAULT 50 NOT NULL,
	"week_label" text DEFAULT '2026-W37' NOT NULL,
	"icon_emoji" text DEFAULT '🎯' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date_key" text NOT NULL,
	"xp_earned" integer DEFAULT 20 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt" text NOT NULL,
	"hint" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"language" text DEFAULT 'Inglês' NOT NULL,
	"language_flag" text DEFAULT '🇺🇸' NOT NULL,
	"level" text DEFAULT 'A1' NOT NULL,
	"duration_min" integer DEFAULT 15 NOT NULL,
	"xp" integer DEFAULT 30 NOT NULL,
	"order_num" integer DEFAULT 0 NOT NULL,
	"tag" text DEFAULT 'Vocabulário' NOT NULL,
	"emoji" text DEFAULT '📚' NOT NULL,
	"gradient" text DEFAULT 'from-sky-500 to-indigo-600' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"host" text NOT NULL,
	"host_role" text DEFAULT 'Teacher' NOT NULL,
	"host_emoji" text DEFAULT '🧑‍🏫' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"language" text DEFAULT 'Inglês' NOT NULL,
	"language_flag" text DEFAULT '🇺🇸' NOT NULL,
	"level" text DEFAULT 'Todos os níveis' NOT NULL,
	"spots_total" integer DEFAULT 50 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tag" text DEFAULT 'Conversation Club' NOT NULL,
	"gradient" text DEFAULT 'from-orange-500 to-pink-600' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"language_tag" text,
	"prompt" text,
	"image_emoji" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"avatar_emoji" text DEFAULT '🦊' NOT NULL,
	"avatar_gradient" text DEFAULT 'from-violet-500 to-fuchsia-500' NOT NULL,
	"level" text DEFAULT 'A2 · Explorer' NOT NULL,
	"target_languages" text DEFAULT 'Inglês' NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "weekly_phrases" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"translation" text DEFAULT '' NOT NULL,
	"pronunciation" text DEFAULT '' NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"context" text DEFAULT '' NOT NULL,
	"week_label" text DEFAULT '2026-W37' NOT NULL,
	"language" text DEFAULT 'Inglês' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_progress_uidx" ON "challenge_progress" USING btree ("challenge_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_user_date_uidx" ON "checkins" USING btree ("user_id","date_key");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_completions_uidx" ON "lesson_completions" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_uidx" ON "reactions" USING btree ("post_id","user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_uidx" ON "reservations" USING btree ("event_id","user_id");