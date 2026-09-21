import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(client, { schema });

async function seed() {
  await client.connect();
  console.log("🌱 Seed iniciando...");

  // Usuário teste ID 1 - que o dashboard?userId=1 espera
  await db.insert(schema.users).values({
    id: 1,
    name: "Raphael Silva",
    username: "raphael",
    email: "raphael@codigoecafe.com",
    avatarEmoji: "🦊",
    avatarGradient: "from-violet-500 to-fuchsia-500",
    level: "B1 · Explorer",
    targetLanguages: "Inglês, Espanhol",
    xp: 150,
    role: "admin",
  }).onConflictDoNothing();

  await db.insert(schema.lessons).values([
    { title: "Saudações Básicas", description: "Aprenda a cumprimentar", language: "Inglês", level: "A1", durationMin: 15, xp: 30, orderNum: 1 },
    { title: "Apresentação Pessoal", description: "Fale sobre você", language: "Inglês", level: "A1", durationMin: 20, xp: 40, orderNum: 2 },
  ]).onConflictDoNothing();

  await db.insert(schema.dailyPrompts).values({
    prompt: "What did you do today?",
    hint: "Use past tense",
    active: true,
  }).onConflictDoNothing();

  await db.insert(schema.weeklyPhrases).values({
    text: "The journey of a thousand miles begins with one step.",
    translation: "A jornada de mil milhas começa com um passo.",
    pronunciation: "dhe jérni...",
    author: "Lao Tzu",
    context: "Motivação",
    weekLabel: "2026-W38",
    language: "Inglês",
    active: true,
  }).onConflictDoNothing();

  console.log("✅ Seed feito!");
  await client.end();
}

seed().catch(e => { console.error(e); process.exit(1); });