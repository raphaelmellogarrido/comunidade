import { Router } from "express";
import { db } from "../db";
import {
  users,
  lessons,
  posts,
  reactions,
  comments,
  liveEvents,
  reservations,
  challenges,
  challengeProgress,
  weeklyPhrases,
  dailyPrompts,
  checkins,
  lessonCompletions,
} from "../db/schema";
import { sql } from "drizzle-orm";

const router = Router();

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function runSeed() {
  const existing = await db.execute(sql`select count(*)::int as c from users`);
  const count = (existing.rows[0] as { c: number })?.c ?? 0;
  if (count > 0) {
    return { ok: true, seeded: false, message: "already seeded" };
  }

  // USERS
  const seedUsers = [
    { name: "Raphael", username: "raphael", avatarEmoji: "🦊", avatarGradient: "from-orange-500 to-pink-600", level: "B1 · Conversador", targetLanguages: "Inglês · Espanhol", xp: 1240, role: "member" },
    { name: "Camila Duarte", username: "camila", avatarEmoji: "🐼", avatarGradient: "from-emerald-500 to-teal-600", level: "A2 · Explorer", targetLanguages: "Inglês", xp: 860, role: "member" },
    { name: "Diego Ramírez", username: "diego", avatarEmoji: "🦁", avatarGradient: "from-amber-500 to-orange-600", level: "B2 · Fluente", targetLanguages: "Inglês · Francês", xp: 2130, role: "mentor" },
    { name: "Teacher Ana", username: "teacher_ana", avatarEmoji: "👩‍🏫", avatarGradient: "from-violet-600 to-indigo-600", level: "Mentora", targetLanguages: "Inglês · Alemão", xp: 5420, role: "mentor" },
    { name: "Breno Miguel", username: "breno", avatarEmoji: "🐸", avatarGradient: "from-lime-500 to-emerald-600", level: "A1 · Iniciante", targetLanguages: "Inglês", xp: 320, role: "member" },
    { name: "Sofia Mendes", username: "sofia", avatarEmoji: "🦋", avatarGradient: "from-pink-500 to-rose-600", level: "B1 · Conversador", targetLanguages: "Espanhol", xp: 1480, role: "member" },
    { name: "Lucas Prado", username: "lucas", avatarEmoji: "🐯", avatarGradient: "from-cyan-500 to-blue-600", level: "A2 · Explorer", targetLanguages: "Inglês · Italiano", xp: 720, role: "member" },
    { name: "Mariana Costa", username: "mari", avatarEmoji: "🌸", avatarGradient: "from-fuchsia-500 to-purple-600", level: "C1 · Avançado", targetLanguages: "Francês", xp: 3100, role: "member" },
  ];
  const insertedUsers = await db.insert(users).values(seedUsers).returning();
  const byUsername = Object.fromEntries(insertedUsers.map((u) => [u.username, u]));

  // LESSONS — 24 aulas
  const lessonSeed = [
    { title: "Small Talk sem Travar", description: "Como puxar assunto, se apresentar e manter uma conversa leve em inglês.", language: "Inglês", languageFlag: "🇺🇸", level: "A1", durationMin: 12, xp: 30, orderNum: 1, tag: "Conversação", emoji: "💬", gradient: "from-sky-500 to-blue-600" },
    { title: "Present Simple na Vida Real", description: "Rotina, hábitos e verdades universais com exemplos do dia a dia.", language: "Inglês", languageFlag: "🇺🇸", level: "A1", durationMin: 15, xp: 35, orderNum: 2, tag: "Gramática", emoji: "🧩", gradient: "from-violet-500 to-purple-600" },
    { title: "100 Palavras de Sobrevivência", description: "O vocabulário essencial para viajar e se virar em qualquer lugar.", language: "Inglês", languageFlag: "🇺🇸", level: "A1", durationMin: 18, xp: 40, orderNum: 3, tag: "Vocabulário", emoji: "🎒", gradient: "from-amber-500 to-orange-600" },
    {
      title: "Listening: Café em Nova York",
      description: "Áudio real com transcrição e shadowing guiado pensados especialmente para você.",
      language: "Inglês",
      languageFlag: "🇺🇸",
      level: "A2",
      durationMin: 14,
      xp: 35,
      orderNum: 4,
      tag: "Listening",
      emoji: "🎧",
      gradient: "from-emerald-500 to-teal-600",
    },
    { title: "Passado sem Medo: Simple Past", description: "Was/were, verbos regulares e irregulares com storytelling.", language: "Inglês", languageFlag: "🇺🇸", level: "A2", durationMin: 16, xp: 40, orderNum: 5, tag: "Gramática", emoji: "⏪", gradient: "from-indigo-500 to-violet-600" },
    { title: "Phrasal Verbs que Caem Sempre", description: "Get up, look for, give up — com memes e exemplos.", language: "Inglês", languageFlag: "🇺🇸", level: "A2", durationMin: 13, xp: 35, orderNum: 6, tag: "Vocabulário", emoji: "🚀", gradient: "from-pink-500 to-rose-600" },
    { title: "Pronúncia: TH, R e V", description: "Treino de sons que brasileiros mais confundem.", language: "Inglês", languageFlag: "🇺🇸", level: "A2", durationMin: 11, xp: 30, orderNum: 7, tag: "Pronúncia", emoji: "🗣️", gradient: "from-cyan-500 to-sky-600" },
    { title: "Futuro: Will x Going To", description: "Planos, promessas e previsões — quando usar cada um.", language: "Inglês", languageFlag: "🇺🇸", level: "B1", durationMin: 15, xp: 40, orderNum: 8, tag: "Gramática", emoji: "🔮", gradient: "from-fuchsia-500 to-pink-600" },
    { title: "Conversa: No Restaurante", description: "Pedir, reclamar com educação e entender o garçom.", language: "Inglês", languageFlag: "🇺🇸", level: "B1", durationMin: 17, xp: 45, orderNum: 9, tag: "Conversação", emoji: "🍔", gradient: "from-orange-500 to-red-500" },
    { title: "Séries sem Legenda — Método", description: "Como usar Friends e Modern Family para aprender de verdade.", language: "Inglês", languageFlag: "🇺🇸", level: "B1", durationMin: 19, xp: 50, orderNum: 10, tag: "Imersão", emoji: "📺", gradient: "from-slate-700 to-slate-900" },
    { title: "Present Perfect Descomplicado", description: "Have you ever…? Experiências de vida sem decoreba.", language: "Inglês", languageFlag: "🇺🇸", level: "B1", durationMin: 18, xp: 50, orderNum: 11, tag: "Gramática", emoji: "✨", gradient: "from-yellow-500 to-amber-600" },
    { title: "Entrevista de Emprego em Inglês", description: "Tell me about yourself + respostas prontas e naturais.", language: "Inglês", languageFlag: "🇺🇸", level: "B2", durationMin: 22, xp: 60, orderNum: 12, tag: "Carreira", emoji: "💼", gradient: "from-blue-600 to-indigo-700" },
    { title: "Hola! Primeiras Frases", description: "Saudações, apresentações e o alfabeto espanhol.", language: "Espanhol", languageFlag: "🇪🇸", level: "A1", durationMin: 12, xp: 30, orderNum: 13, tag: "Vocabulário", emoji: "👋", gradient: "from-red-500 to-orange-500" },
    { title: "Ser x Estar de Uma Vez", description: "A diferença definitiva com mapas mentais.", language: "Espanhol", languageFlag: "🇪🇸", level: "A1", durationMin: 14, xp: 35, orderNum: 14, tag: "Gramática", emoji: "⚖️", gradient: "from-rose-500 to-red-600" },
    { title: "No Mercado: Comida e Preços", description: "Vocabulário delicioso para feiras e mercados.", language: "Espanhol", languageFlag: "🇪🇸", level: "A2", durationMin: 13, xp: 35, orderNum: 15, tag: "Vocabulário", emoji: "🥑", gradient: "from-green-500 to-emerald-600" },
    { title: "Pretérito Perfeito e Indefinido", description: "Conte o que você fez ontem sem travar.", language: "Espanhol", languageFlag: "🇪🇸", level: "B1", durationMin: 17, xp: 45, orderNum: 16, tag: "Gramática", emoji: "📝", gradient: "from-purple-500 to-violet-600" },
    { title: "Reggaeton para Aprender", description: "Letras, gírias e ritmo com Shakira e Bad Bunny.", language: "Espanhol", languageFlag: "🇪🇸", level: "B1", durationMin: 15, xp: 40, orderNum: 17, tag: "Imersão", emoji: "🎶", gradient: "from-pink-600 to-purple-600" },
    { title: "Bonjour! Francês do Zero", description: "Sons nasais, apresentações e café parisiense.", language: "Francês", languageFlag: "🇫🇷", level: "A1", durationMin: 14, xp: 35, orderNum: 18, tag: "Vocabulário", emoji: "🥐", gradient: "from-blue-500 to-sky-500" },
    { title: "Être e Avoir sem Drama", description: "Os dois verbos que abrem 80% do francês.", language: "Francês", languageFlag: "🇫🇷", level: "A1", durationMin: 13, xp: 35, orderNum: 19, tag: "Gramática", emoji: "🗼", gradient: "from-indigo-500 to-blue-600" },
    { title: "Francês para Viagem", description: "Aeroporto, hotel e restaurante — frases prontas.", language: "Francês", languageFlag: "🇫🇷", level: "A2", durationMin: 16, xp: 40, orderNum: 20, tag: "Conversação", emoji: "✈️", gradient: "from-cyan-600 to-blue-700" },
    { title: "Italiano Espresso", description: "Ciao! Ordine un caffè como um italiano de verdade.", language: "Italiano", languageFlag: "🇮🇹", level: "A1", durationMin: 12, xp: 30, orderNum: 21, tag: "Conversação", emoji: "🍕", gradient: "from-green-600 to-teal-600" },
    { title: "Alemão sem Susto", description: "Artigos der/die/das com lógica e humor.", language: "Alemão", languageFlag: "🇩🇪", level: "A1", durationMin: 15, xp: 40, orderNum: 22, tag: "Gramática", emoji: "🥨", gradient: "from-yellow-600 to-orange-700" },
    { title: "Shadowing Avançado", description: "Técnica de repetição para soar nativo em 30 dias.", language: "Inglês", languageFlag: "🇺🇸", level: "B2", durationMin: 20, xp: 55, orderNum: 23, tag: "Pronúncia", emoji: "🎤", gradient: "from-violet-600 to-fuchsia-600" },
    { title: "Debate: Filmes x Livros", description: "Argumente, concorde e discorde com elegância.", language: "Inglês", languageFlag: "🇺🇸", level: "C1", durationMin: 24, xp: 70, orderNum: 24, tag: "Conversação", emoji: "🎬", gradient: "from-slate-800 to-indigo-900" },
  ];
  const insertedLessons = await db.insert(lessons).values(lessonSeed).returning();

  // CHECKINS — simula presença
  const checkinRows: { userId: number; dateKey: string; xpEarned: number }[] = [];
  const uids = insertedUsers.map((u) => u.id);
  for (let d = 0; d < 14; d++) {
    const dk = dateKey(daysAgo(d));
    const howMany = d === 0 ? 5 : d < 7 ? 4 + ((d * 7) % 3) : 3 + ((d * 5) % 3);
    for (let i = 0; i < howMany; i++) {
      const uid = uids[(d + i) % uids.length];
      checkinRows.push({ userId: uid, dateKey: dk, xpEarned: 20 });
    }
  }
  // garante que Raphael tem sequência de 4 dias mas NÃO hoje (para poder clicar)
  const raphaelId = byUsername["raphael"].id;
  for (let d = 1; d <= 4; d++) {
    checkinRows.push({ userId: raphaelId, dateKey: dateKey(daysAgo(d)), xpEarned: 20 });
  }
  // remove duplicatas
  const seen = new Set<string>();
  const dedup = checkinRows.filter((r) => {
    const k = `${r.userId}-${r.dateKey}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // garante que não há checkin hoje do raphael
  const today = dateKey(new Date());
  const filtered = dedup.filter((r) => !(r.userId === raphaelId && r.dateKey === today));
  await db.insert(checkins).values(filtered).onConflictDoNothing();

  // LESSON COMPLETIONS — Raphael fez 7 aulas
  const raphaelDone = insertedLessons.slice(0, 7).map((l) => ({ userId: raphaelId, lessonId: l.id }));
  await db.insert(lessonCompletions).values(raphaelDone).onConflictDoNothing();
  const sofiaDone = insertedLessons.slice(0, 12).map((l) => ({ userId: byUsername["sofia"].id, lessonId: l.id }));
  await db.insert(lessonCompletions).values(sofiaDone).onConflictDoNothing();

  // LIVE EVENTS
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  nextMonday.setHours(19, 0, 0, 0);
  const nextMondayEnd = new Date(nextMonday);
  nextMondayEnd.setHours(20, 0, 0, 0);
  const thursday = new Date(now);
  thursday.setDate(now.getDate() + ((4 - now.getDay() + 7) % 7 || 7));
  thursday.setHours(12, 30, 0, 0);
  const thursdayEnd = new Date(thursday);
  thursdayEnd.setHours(13, 15, 0, 0);

  const insertedEvents = await db
    .insert(liveEvents)
    .values([
      {
        title: "Conversation Club: Travel Stories ✈️",
        host: "Teacher Ana",
        hostRole: "Teacher · C2",
        hostEmoji: "👩‍🏫",
        startsAt: nextMonday,
        endsAt: nextMondayEnd,
        language: "Inglês",
        languageFlag: "🇺🇸",
        level: "A2 ao B2",
        spotsTotal: 30,
        description: "Conte sua melhor história de viagem em inglês. Breakout rooms, correção gentil e muito speaking. Traga 3 fotos no celular!",
        tag: "Conversation Club",
        gradient: "from-orange-500 to-pink-600",
      },
      {
        title: "Tertulia en Español: Música 🎶",
        host: "Diego Ramírez",
        hostRole: "Mentor · Nativo",
        hostEmoji: "🦁",
        startsAt: thursday,
        endsAt: thursdayEnd,
        language: "Espanhol",
        languageFlag: "🇪🇸",
        level: "Todos os níveis",
        spotsTotal: 25,
        description: "Vamos falar de música latina, aprender gírias das letras e cantar junto. Nível iniciante bem-vindo!",
        tag: "Tertulia",
        gradient: "from-red-500 to-orange-500",
      },
    ])
    .returning();
  await db
    .insert(reservations)
    .values([
      { eventId: insertedEvents[0].id, userId: byUsername["sofia"].id },
      { eventId: insertedEvents[0].id, userId: byUsername["camila"].id },
      { eventId: insertedEvents[1].id, userId: byUsername["lucas"].id },
    ])
    .onConflictDoNothing();

  // CHALLENGES
  const insertedChallenges = await db
    .insert(challenges)
    .values([
      { title: "Shadowing de 5 minutos", description: "Escolha 1 áudio e repita junto, imitando ritmo e entonação.", xp: 50, weekLabel: "2026-W37", iconEmoji: "🎤" },
      { title: "10 palavras novas no Anki", description: "Cadastre 10 palavras que você encontrou essa semana.", xp: 40, weekLabel: "2026-W37", iconEmoji: "🧠" },
      { title: "Voice message para um buddy", description: "Mande 1 áudio de 1 min no idioma que estuda.", xp: 60, weekLabel: "2026-W37", iconEmoji: "🎙️" },
      { title: "Assista sem legenda", description: "20 min de série/filme sem legenda no idioma alvo.", xp: 50, weekLabel: "2026-W37", iconEmoji: "📺" },
    ])
    .returning();
  await db
    .insert(challengeProgress)
    .values([{ challengeId: insertedChallenges[0].id, userId: raphaelId, done: true, completedAt: new Date() }])
    .onConflictDoNothing();

  // PHRASE
  await db.insert(weeklyPhrases).values({
    text: "Practice makes progress, not perfect.",
    translation: "Prática traz progresso, não perfeição.",
    pronunciation: "/ˈpræk.tɪs meɪks ˈprɑː.ɡres nɑːt pərˈfekt/",
    author: "Mote da comunidade",
    context: "Use essa frase quando errar uma palavra no speaking — errar faz parte do jogo.",
    weekLabel: "2026-W37",
    language: "Inglês",
    active: true,
  });

  // PROMPTS
  await db.insert(dailyPrompts).values([
    { prompt: "Qual palavra nova você aprendeu hoje?", hint: "Ex: Hoje eu aprendi 'resilient' — resiliente. Vi num post e...", active: true },
    { prompt: "Como foi sua prática de listening hoje?", hint: "Conte o que ouviu: música, podcast, série...", active: false },
    { prompt: "Qual frase você conseguiu falar sem travar?", hint: "Celebre as pequenas vitórias!", active: false },
  ]);

  // POSTS
  const postSeed = [
    {
      userId: byUsername["teacher_ana"].id,
      content: "🇺🇸 Word of the day: **serendipity** (n.) — descobrir algo maravilhoso sem estar procurando.\n\nEx: *Meeting my language buddy was pure serendipity.*\n\nConsegue criar uma frase com ela? Manda aqui 👇",
      visibility: "public",
      languageTag: "Inglês",
      prompt: "Palavra do dia",
      imageEmoji: null,
    },
    {
      userId: byUsername["diego"].id,
      content: "Consegui pedir um café inteiro em francês hoje sem mudar pro inglês! ☕🇫🇷\n\n*« Un café crème, s'il vous plaît »* — o garçom até sorriu. Pequenas vitórias contam MUITO.",
      visibility: "public",
      languageTag: "Francês",
      prompt: "Qual foi sua pequena vitória hoje?",
      imageEmoji: null,
    },
    {
      userId: byUsername["sofia"].id,
      content: "Dia 12 de espanhol seguido! 🔥 Hoje travei no pretérito indefinido mas fiz o shadowing do Bad Bunny e destravou. Alguém mais usa música pra estudar?",
      visibility: "public",
      languageTag: "Espanhol",
      prompt: "Como foi sua prática hoje?",
      imageEmoji: "🎶",
    },
    {
      userId: byUsername["camila"].id,
      content: "Gente, dica de ouro: mudei o idioma do meu celular pra inglês e em 1 semana aprendi umas 30 palavras sem esforço. *Settings, wallpaper, snooze*... tudo vira aula 😅",
      visibility: "public",
      languageTag: "Inglês",
      prompt: "Qual hack de estudos funcionou pra você?",
      imageEmoji: null,
    },
    {
      userId: byUsername["breno"].id,
      content: "Meditação com a tutora hoje! Quer dizer... conversação 😂 Fiz minha primeira call de 15 min em inglês. Travei, ri, continuei. Bora!",
      visibility: "public",
      languageTag: "Inglês",
      prompt: "Como foi sua prática hoje?",
      imageEmoji: "🎥",
    },
    {
      userId: byUsername["lucas"].id,
      content: "Alguém afim de ser meu buddy de italiano? 🇮🇹 Quero trocar 1 áudio por dia. Nível A1, zero vergonha de errar!",
      visibility: "public",
      languageTag: "Italiano",
      prompt: "Encontre seu buddy",
      imageEmoji: null,
    },
  ];
  const insertedPosts = await db.insert(posts).values(postSeed).returning();

  await db
    .insert(reactions)
    .values([
      { postId: insertedPosts[0].id, userId: byUsername["raphael"].id, kind: "heart" },
      { postId: insertedPosts[0].id, userId: byUsername["sofia"].id, kind: "heart" },
      { postId: insertedPosts[0].id, userId: byUsername["camila"].id, kind: "fire" },
      { postId: insertedPosts[1].id, userId: byUsername["raphael"].id, kind: "fire" },
      { postId: insertedPosts[1].id, userId: byUsername["sofia"].id, kind: "heart" },
      { postId: insertedPosts[2].id, userId: byUsername["raphael"].id, kind: "clap" },
      { postId: insertedPosts[2].id, userId: byUsername["lucas"].id, kind: "fire" },
      { postId: insertedPosts[3].id, userId: byUsername["sofia"].id, kind: "heart" },
      { postId: insertedPosts[4].id, userId: byUsername["camila"].id, kind: "clap" },
    ])
    .onConflictDoNothing();

  await db.insert(comments).values([
    { postId: insertedPosts[0].id, userId: byUsername["sofia"].id, content: "My serendipity was finding this community! 💛" },
    { postId: insertedPosts[0].id, userId: byUsername["teacher_ana"].id, content: "Perfect sentence, Sofia! 👏 Nota 10 pro uso." },
    { postId: insertedPosts[2].id, userId: byUsername["diego"].id, content: "Música é o melhor SRS natural que existe. Continua! 🎧" },
    { postId: insertedPosts[5].id, userId: byUsername["mari"].id, content: "Eu topo! Te chamei — facciamo pratica insieme! 🇮🇹" },
  ]);

  return { ok: true, seeded: true };
}

router.get("/", async (_req, res) => {
  try {
    res.json(await runSeed());
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.post("/", async (_req, res) => {
  try {
    res.json(await runSeed());
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
