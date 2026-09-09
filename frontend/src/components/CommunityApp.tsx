"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

type User = {
  id: number; name: string; username: string; avatarEmoji: string; avatarGradient: string;
  level: string; targetLanguages: string; xp: number; role: string;
};
type WeekDay = { key: string; label: string; done: boolean; isToday: boolean };
type Dashboard = {
  me: User; streak: number; checkedToday: boolean; weekDays: WeekDay[];
  journey: { total: number; done: number; doneIds: number[]; percent: number };
  together: { studiedToday: number; sharesToday: number; totalPresence: number; avatars: { id: number; name: string; avatarEmoji: string; avatarGradient: string }[] };
  nextEvent: {
    id: number; title: string; host: string; hostRole: string; hostEmoji: string;
    startsAt: string; endsAt: string; language: string; languageFlag: string; level: string;
    spotsTotal: number; description: string; tag: string; gradient: string;
    reservedCount: number; myReserved: boolean; spotsLeft: number;
    avatars: { id: number; name: string; avatarEmoji: string; avatarGradient: string }[];
  } | null;
  challenges: { id: number; title: string; description: string; xp: number; iconEmoji: string; done: boolean }[];
  phrase: { id: number; text: string; translation: string; pronunciation: string; author: string; context: string; language: string } | null;
  prompt: { id: number; prompt: string; hint: string } | null;
  leaders: { id: number; name: string; avatarEmoji: string; avatarGradient: string; xp: number; level: string }[];
  myRank: number;
};
type Post = {
  id: number; content: string; visibility: string; languageTag: string | null; prompt: string | null;
  imageEmoji: string | null; createdAt: string; userId: number; userName: string;
  avatarEmoji: string; avatarGradient: string; userLevel: string;
  hearts: number; fires: number; claps: number; commentsCount: number;
  reactedHeart: boolean; reactedFire: boolean; reactedClap: boolean;
};
type Lesson = {
  id: number; title: string; description: string; language: string; languageFlag: string;
  level: string; durationMin: number; xp: number; orderNum: number; tag: string; emoji: string; gradient: string; done: boolean;
};
type LiveEvent = {
  id: number; title: string; host: string; hostRole: string; hostEmoji: string;
  startsAt: string; endsAt: string; language: string; languageFlag: string; level: string;
  spotsTotal: number; description: string; tag: string; gradient: string;
  reservedCount: number; myReserved: boolean;
};
type Comment = { id: number; content: string; createdAt: string; userId: number; userName: string; avatarEmoji: string; avatarGradient: string; userLevel: string };

const USER_ID = 1;
const LANGS = ["Inglês", "Espanhol", "Francês", "Italiano", "Alemão"];
const LANG_FLAG: Record<string, string> = { Inglês: "🇺🇸", Espanhol: "🇪🇸", Francês: "🇫🇷", Italiano: "🇮🇹", Alemão: "🇩🇪" };

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && d.toDateString() === now.toDateString()) return `hoje às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `ontem às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtEvent(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const ds = `${dias[s.getDay()]}, ${s.getDate()} ${meses[s.getMonth()]} · ${s.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}–${e.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return ds;
}

function renderRich(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} className="font-extrabold text-slate-900">{p.slice(2, -2)}</strong>;
    }
    const italic = p.split(/(\*[^*]+\*)/g);
    if (italic.length > 1) {
      return (
        <span key={i}>
          {italic.map((q, j) =>
            q.startsWith("*") && q.endsWith("*") && q.length > 2 ? (
              <em key={j} className="text-slate-700">{q.slice(1, -1)}</em>
            ) : (
              <span key={j}>{q}</span>
            )
          )}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function Avatar({ emoji, gradient, size = "md" }: { emoji: string; gradient: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sz = size === "sm" ? "h-8 w-8 text-base" : size === "lg" ? "h-12 w-12 text-2xl" : size === "xl" ? "h-14 w-14 text-3xl" : "h-10 w-10 text-xl";
  return (
    <div className={`relative grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${gradient} ${sz} shadow-lg`}>
      <span className="drop-shadow-sm">{emoji}</span>
    </div>
  );
}

export default function CommunityApp() {
  const [tab, setTab] = useState<"inicio" | "aulas" | "aovivo">("inicio");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "mentor">("public");
  const [langTag, setLangTag] = useState("Inglês");
  const [filterLang, setFilterLang] = useState("all");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [lessonSearch, setLessonSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<number, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<number, string>>({});
  const [toasts, setToasts] = useState<{ id: number; title: string; sub?: string; emoji: string }[]>([]);
  const [burst, setBurst] = useState(false);
  const [posting, setPosting] = useState(false);
  const [checking, setChecking] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const pushToast = useCallback((title: string, emoji: string, sub?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, title, sub, emoji }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const loadDashboard = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/dashboard?userId=${USER_ID}`));
    if (r.status === 404) {
      await fetch(apiUrl("/api/seed"), { method: "POST" });
      const r2 = await fetch(apiUrl(`/api/dashboard?userId=${USER_ID}`));
      const j2 = await r2.json();
      setDash(j2);
      return j2 as Dashboard;
    }
    const j = await r.json();
    setDash(j);
    return j as Dashboard;
  }, []);

  const loadPosts = useCallback(async (lang = filterLang) => {
    const r = await fetch(apiUrl(`/api/posts?userId=${USER_ID}&lang=${encodeURIComponent(lang)}`));
    const j = await r.json();
    setPosts(j.posts ?? []);
  }, [filterLang]);

  const loadLessons = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/lessons?userId=${USER_ID}`));
    const j = await r.json();
    setLessons(j.lessons ?? []);
  }, []);

  const loadEvents = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/events?userId=${USER_ID}`));
    const j = await r.json();
    setEvents(j.events ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadDashboard();
        await Promise.all([loadPosts("all"), loadLessons(), loadEvents()]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPosts(filterLang);
  }, [filterLang, loadPosts]);

  const doCheckin = async () => {
    if (!dash || dash.checkedToday || checking) return;
    setChecking(true);
    const r = await fetch(apiUrl("/api/checkin"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: USER_ID }) });
    setChecking(false);
    if (r.ok) {
      setBurst(true);
      setTimeout(() => setBurst(false), 1600);
      pushToast("Prática registrada! +20 XP", "🔥", "Sua sequência continua crescendo");
      await loadDashboard();
    }
  };

  const doShare = async () => {
    if (!composer.trim() || posting) return;
    setPosting(true);
    const r = await fetch(apiUrl("/api/posts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID, content: composer.trim(), visibility: visibility === "public" ? "public" : visibility === "private" ? "private" : "mentor", languageTag: langTag, prompt: dash?.prompt?.prompt ?? null }),
    });
    setPosting(false);
    if (r.ok) {
      setComposer("");
      pushToast("Compartilhado! +10 XP", "🚀", visibility === "public" ? "Visível para toda a comunidade" : visibility === "private" ? "Visível só para você" : "Visível para mentores");
      await loadPosts();
      await loadDashboard();
    }
  };

  const doReact = async (postId: number, kind: string) => {
    setPosts((ps) =>
      ps.map((p) => {
        if (p.id !== postId) return p;
        const key = kind === "heart" ? "reactedHeart" : kind === "fire" ? "reactedFire" : "reactedClap";
        const countKey = kind === "heart" ? "hearts" : kind === "fire" ? "fires" : "claps";
        const on = !p[key as keyof Post];
        return { ...p, [key]: on, [countKey]: (p[countKey as keyof Post] as number) + (on ? 1 : -1) };
      })
    );
    await fetch(apiUrl(`/api/posts/${postId}/react`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: USER_ID, kind }) });
  };

  const toggleComments = async (postId: number) => {
    const open = !expanded[postId];
    setExpanded((e) => ({ ...e, [postId]: open }));
    if (open && !commentsMap[postId]) {
      const r = await fetch(apiUrl(`/api/posts/${postId}/comments`));
      const j = await r.json();
      setCommentsMap((m) => ({ ...m, [postId]: j.comments ?? [] }));
    }
  };

  const sendComment = async (postId: number) => {
    const text = (commentInput[postId] ?? "").trim();
    if (!text) return;
    const r = await fetch(apiUrl(`/api/posts/${postId}/comments`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: USER_ID, content: text }) });
    if (r.ok) {
      setCommentInput((m) => ({ ...m, [postId]: "" }));
      const rc = await fetch(apiUrl(`/api/posts/${postId}/comments`));
      const j = await rc.json();
      setCommentsMap((m) => ({ ...m, [postId]: j.comments ?? [] }));
      setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, commentsCount: (j.comments ?? []).length } : p)));
      pushToast("Comentário enviado! +5 XP", "💬");
      loadDashboard();
    }
  };

  const deletePost = async (postId: number) => {
    if (!confirm("Apagar essa partilha?")) return;
    const r = await fetch(apiUrl(`/api/posts/${postId}?userId=${USER_ID}`), { method: "DELETE" });
    if (r.ok) {
      setPosts((ps) => ps.filter((p) => p.id !== postId));
      pushToast("Partilha apagada", "🗑️");
      loadDashboard();
    }
  };

  const toggleLesson = async (lesson: Lesson) => {
    if (!lesson.done) {
      const r = await fetch(apiUrl(`/api/lessons/${lesson.id}/complete`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: USER_ID }) });
      if (r.ok) {
        const j = await r.json();
        pushToast(`Aula concluída! +${j.xp ?? lesson.xp} XP`, "🎓", lesson.title);
        setLessons((ls) => ls.map((l) => (l.id === lesson.id ? { ...l, done: true } : l)));
        loadDashboard();
      }
    } else {
      await fetch(apiUrl(`/api/lessons/${lesson.id}/complete?userId=${USER_ID}`), { method: "DELETE" });
      setLessons((ls) => ls.map((l) => (l.id === lesson.id ? { ...l, done: false } : l)));
      loadDashboard();
    }
  };

  const toggleReserve = async (eventId: number) => {
    const r = await fetch(apiUrl(`/api/events/${eventId}/reserve`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: USER_ID }) });
    if (r.ok) {
      const j = await r.json();
      pushToast(j.reserved ? "Vaga reservada! 🎉" : "Reserva cancelada", j.reserved ? "🎟️" : "↩️", j.reserved ? "Te vemos ao vivo!" : undefined);
      loadEvents();
      loadDashboard();
    }
  };

  const toggleChallenge = async (id: number) => {
    const r = await fetch(apiUrl(`/api/challenges/${id}/toggle`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: USER_ID }) });
    if (r.ok) {
      const j = await r.json();
      if (j.done) pushToast(`Desafio concluído! +${Math.abs(j.xp)} XP`, "🏆");
      setDash((d) => (d ? { ...d, challenges: d.challenges.map((c) => (c.id === id ? { ...c, done: j.done } : c)) } : d));
      loadDashboard();
    }
  };

  const wrapSelection = (before: string, after: string) => {
    const ta = taRef.current;
    if (!ta) {
      setComposer((c) => `${c}${before}texto${after}`);
      return;
    }
    const { selectionStart, selectionEnd } = ta;
    const sel = composer.slice(selectionStart, selectionEnd) || "texto";
    const next = composer.slice(0, selectionStart) + before + sel + after + composer.slice(selectionEnd);
    setComposer(next.slice(0, 600));
    setTimeout(() => ta.focus(), 0);
  };

  const challengesDone = useMemo(() => dash?.challenges.filter((c) => c.done).length ?? 0, [dash]);
  const challengesTotalXp = useMemo(() => dash?.challenges.filter((c) => c.done).reduce((a, c) => a + c.xp, 0) ?? 0, [dash]);
  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const okLang = lessonFilter === "all" || l.language === lessonFilter;
      const okSearch = !lessonSearch || (l.title + " " + l.description + " " + l.tag).toLowerCase().includes(lessonSearch.toLowerCase());
      return okLang && okSearch;
    });
  }, [lessons, lessonFilter, lessonSearch]);

  if (loading || !dash) {
    return (
      <div className="bg-mesh min-h-screen">
        <div className="mx-auto max-w-[1400px] px-4 py-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500" />
            <div className="h-8 w-48 animate-pulse rounded-full bg-white/70" />
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_330px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-48 animate-pulse rounded-3xl bg-white/70" />
                <div className="h-64 animate-pulse rounded-3xl bg-white/70" />
                <div className="h-40 animate-pulse rounded-3xl bg-white/70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const me = dash.me;
  const R = 52;
  const C = 2 * Math.PI * R;
  const journeyOffset = C - (C * dash.journey.percent) / 100;

  return (
    <div className="bg-mesh min-h-screen pb-16">
      {/* floating deco */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-float-slow absolute -left-10 top-24 text-5xl opacity-20">🇧🇷</div>
        <div className="animate-float-slow absolute right-6 top-40 text-4xl opacity-20" style={{ animationDelay: "1.2s" }}>🇺🇸</div>
        <div className="animate-float-slow absolute bottom-20 left-[8%] text-4xl opacity-20" style={{ animationDelay: "2s" }}>🇪🇸</div>
        <div className="animate-float-slow absolute bottom-32 right-[10%] text-5xl opacity-20" style={{ animationDelay: "0.6s" }}>🇫🇷</div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
          <button onClick={() => setTab("inicio")} className="flex items-center gap-2.5">
            <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 text-2xl shadow-lg shadow-fuchsia-500/30">
              🌍
              <div className="shimmer absolute inset-0" />
            </div>
            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight">LinguaLoop</span>
                <span className="rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Beta</span>
              </div>
              <div className="text-xs font-bold text-slate-500">Comunidade · Idiomas 🌎</div>
            </div>
          </button>

          <nav className="mx-auto hidden items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/80 p-1.5 md:flex">
            {(
              [
                { k: "inicio", label: "Início", icon: "🏠" },
                { k: "aulas", label: `Aulas · ${dash.journey.done}/${dash.journey.total}`, icon: "📚" },
                { k: "aovivo", label: "Ao vivo", icon: "📡" },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition-all ${
                  tab === t.k ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1.5 text-sm font-black text-amber-700 sm:flex">
              <span>⚡</span> {me.xp.toLocaleString("pt-BR")} XP
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border border-orange-200 bg-gradient-to-r from-orange-50 to-rose-50 px-3 py-1.5 text-sm font-black text-orange-700 sm:flex">
              <span className="animate-flame">🔥</span> {dash.streak}
            </div>
            <button className="hidden rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 lg:block">
              Posso ajudar? 💬
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm">
              <Avatar emoji={me.avatarEmoji} gradient={me.avatarGradient} size="sm" />
              <div className="hidden leading-tight sm:block">
                <div className="text-xs font-black">Olá, {me.name.split(" ")[0]}</div>
                <div className="text-[10px] font-bold text-slate-500">#{dash.myRank} · {me.level.split("·")[0].trim()}</div>
              </div>
            </div>
          </div>
        </div>
        {/* mobile tabs */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
          {(
            [
              { k: "inicio", label: "🏠 Início" },
              { k: "aulas", label: `📚 Aulas ${dash.journey.done}/${dash.journey.total}` },
              { k: "aovivo", label: "📡 Ao vivo" },
            ] as const
          ).map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold ${tab === t.k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "inicio" && (
        <>
          {/* HERO STRIP */}
          <div className="mx-auto max-w-[1400px] px-4 pt-5">
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 p-[2px] shadow-xl shadow-fuchsia-500/20">
              <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 px-6 py-5 text-white">
                <div className="absolute -right-6 -top-8 text-[110px] opacity-20">🗺️</div>
                <div className="absolute right-24 top-2 hidden text-3xl md:block">✈️</div>
                <div className="absolute bottom-2 right-40 hidden text-2xl md:block">🎧</div>
                <div className="relative flex flex-wrap items-center gap-4">
                  <div className="min-w-[220px] flex-1">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/80">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-lime-300" />
                      Semana da fluência · {dash.together.studiedToday} praticando agora
                    </div>
                    <h1 className="mt-1 text-2xl font-black leading-tight md:text-3xl">
                      ¡Hola, {me.name.split(" ")[0]}! Ready to <span className="underline decoration-yellow-300 decoration-wavy underline-offset-4">level up</span>? 🚀
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-white/85">
                      {dash.checkedToday ? "Você já praticou hoje. Que tal ajudar alguém no feed?" : "Faltam poucos minutos para manter sua sequência de " + dash.streak + " dias. Bora praticar?"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur">
                    <div className="text-center">
                      <div className="text-2xl font-black">{dash.journey.percent}%</div>
                      <div className="text-[11px] font-bold text-white/80">da jornada</div>
                    </div>
                    <div className="h-12 w-px bg-white/25" />
                    <div className="text-center">
                      <div className="text-2xl font-black">#{dash.myRank}</div>
                      <div className="text-[11px] font-bold text-white/80">no ranking</div>
                    </div>
                    <div className="h-12 w-px bg-white/25" />
                    <div className="text-center">
                      <div className="text-2xl font-black">{challengesDone}/{dash.challenges.length}</div>
                      <div className="text-[11px] font-bold text-white/80">desafios</div>
                    </div>
                    <button onClick={() => setTab("aulas")} className="ml-1 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-fuchsia-700 shadow-lg transition hover:scale-105">
                      Continuar ▶
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN GRID */}
          <main className="mx-auto grid max-w-[1400px] gap-5 px-4 pt-5 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_340px]">
            {/* LEFT */}
            <aside className="space-y-5">
              {/* SEQUÊNCIA */}
              <section className="card-ring overflow-hidden rounded-3xl border border-white bg-white">
                <div className="bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600 px-5 py-3 text-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-[0.14em]">🔥 Sequência</h2>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black backdrop-blur">{dash.streak} DIAS SEGUIDOS</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-7 gap-1.5">
                    {dash.weekDays.map((d) => (
                      <div key={d.key} className="flex flex-col items-center gap-1">
                        <div
                          className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black transition-all ${
                            d.done
                              ? "bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-500/30"
                              : d.isToday
                                ? "border-2 border-dashed border-orange-400 bg-orange-50 text-orange-400"
                                : "bg-slate-100 text-slate-300"
                          }`}
                          title={d.key}
                        >
                          {d.done ? "✓" : d.isToday ? "•" : "○"}
                        </div>
                        <span className={`text-[10px] font-black ${d.isToday ? "text-orange-500" : "text-slate-400"}`}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2.5 text-xs font-bold text-amber-800">
                    <span className="text-base">🌱</span> A consistência é o segredo da fluência
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-black text-slate-500">
                      <span>Meta semanal: 5 dias</span>
                      <span>{Math.min(dash.weekDays.filter((d) => d.done).length, 7)}/5</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-600 transition-all" style={{ width: `${Math.min((dash.weekDays.filter((d) => d.done).length / 5) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </section>

              {/* JORNADA */}
              <section className="card-ring rounded-3xl border border-white bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">🚀 Sua jornada</h2>
                  <button onClick={() => setTab("aulas")} className="text-xs font-black text-fuchsia-600 hover:underline">
                    Bora pra aula? →
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative h-[132px] w-[132px] shrink-0">
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                      <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f0fa" strokeWidth="13" />
                      <circle cx="60" cy="60" r={R} fill="none" stroke="url(#gradJourney)" strokeWidth="13" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={journeyOffset} className="transition-all duration-700" />
                      <defs>
                        <linearGradient id="gradJourney" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="55%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 grid place-items-center text-center">
                      <div>
                        <div className="text-2xl font-black text-gradient">{dash.journey.done}/{dash.journey.total}</div>
                        <div className="text-[10px] font-black text-slate-500">{dash.journey.percent}% da jornada</div>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-3">
                      <div className="text-[11px] font-black uppercase text-fuchsia-600">Nível atual</div>
                      <div className="text-sm font-black">{me.level}</div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 p-3">
                      <div className="text-[11px] font-black uppercase text-sky-600">Foco</div>
                      <div className="truncate text-sm font-black">{me.targetLanguages}</div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setTab("aulas")} className="mt-4 w-full rounded-2xl bg-slate-900 py-2.5 text-sm font-black text-white transition hover:bg-slate-800">
                  Ver minha trilha 🗺️
                </button>
              </section>

              {/* ESTUDANDO JUNTO */}
              <section className="card-ring overflow-hidden rounded-3xl border border-white bg-white">
                <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-white">
                  <h2 className="text-xs font-black uppercase tracking-[0.14em]">👥 Estudando junto</h2>
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] font-black"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-300" /> AO VIVO</span>
                </div>
                <div className="grid grid-cols-3 gap-2 p-4">
                  <div className="rounded-2xl bg-gradient-to-b from-orange-50 to-amber-50 p-3 text-center">
                    <div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white text-lg shadow-sm">🧑‍🤝‍🧑</div>
                    <div className="mt-1 text-xl font-black">{dash.together.studiedToday}</div>
                    <div className="text-[10px] font-bold leading-tight text-slate-500">pessoas praticaram hoje</div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-b from-sky-50 to-cyan-50 p-3 text-center">
                    <div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white text-lg shadow-sm">💬</div>
                    <div className="mt-1 text-xl font-black">{dash.together.sharesToday}</div>
                    <div className="text-[10px] font-bold leading-tight text-slate-500">partilhas hoje</div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-b from-violet-50 to-fuchsia-50 p-3 text-center">
                    <div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white text-lg shadow-sm">📅</div>
                    <div className="mt-1 text-xl font-black">{dash.together.totalPresence}</div>
                    <div className="text-[10px] font-bold leading-tight text-slate-500">dias de presença somados</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 pb-4">
                  <div className="flex -space-x-2">
                    {dash.together.avatars.slice(0, 6).map((a) => (
                      <div key={a.id} title={a.name} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-gradient-to-br text-sm ${a.avatarGradient} shadow`}>{a.avatarEmoji}</div>
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">estão com você hoje ✨</span>
                </div>
              </section>

              {/* RANKING */}
              <section className="card-ring rounded-3xl border border-white bg-white p-5">
                <h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">🏆 Ranking da semana</h2>
                <div className="mt-3 space-y-2">
                  {dash.leaders.map((l, i) => (
                    <div key={l.id} className={`flex items-center gap-2.5 rounded-2xl p-2 ${l.id === me.id ? "bg-gradient-to-r from-amber-50 to-orange-50 ring-1 ring-amber-200" : "bg-slate-50"}`}>
                      <span className={`grid h-7 w-7 place-items-center rounded-xl text-sm font-black ${i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-200 text-orange-800" : "bg-white text-slate-500"}`}>
                        {i + 1}
                      </span>
                      <Avatar emoji={l.avatarEmoji} gradient={l.avatarGradient} size="sm" />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="truncate text-xs font-black">{l.name} {l.id === me.id && <span className="text-amber-600">(você)</span>}</div>
                        <div className="text-[10px] font-bold text-slate-500">{l.level}</div>
                      </div>
                      <div className="text-xs font-black text-amber-600">⚡{l.xp}</div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>

            {/* CENTER — FEED */}
            <section className="min-w-0 space-y-5">
              {/* COMPOSER */}
              <div className="card-ring overflow-hidden rounded-3xl border border-white bg-white">
                <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-white">
                  <h2 className="text-xs font-black uppercase tracking-[0.14em]">✍️ Sua prática hoje</h2>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-black backdrop-blur">💡 Pergunta diária</span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl font-black leading-snug md:text-2xl">{dash.prompt?.prompt ?? "Como foi sua prática hoje?"}</h3>
                  {dash.prompt?.hint && <p className="mt-1 text-sm font-semibold text-slate-500">{dash.prompt.hint}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                      <button onClick={() => wrapSelection("**", "**")} className="grid h-8 w-8 place-items-center rounded-lg text-sm font-black hover:bg-white" title="Negrito">B</button>
                      <button onClick={() => wrapSelection("*", "*")} className="grid h-8 w-8 place-items-center rounded-lg text-sm italic hover:bg-white" title="Itálico">I</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-black uppercase text-slate-400">Idioma:</span>
                      {LANGS.map((l) => (
                        <button key={l} onClick={() => setLangTag(l)} className={`rounded-full px-2.5 py-1 text-xs font-black transition ${langTag === l ? "bg-slate-900 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                          {LANG_FLAG[l]} {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <textarea
                      ref={taRef}
                      value={composer}
                      onChange={(e) => setComposer(e.target.value.slice(0, 600))}
                      placeholder={`Hoje eu aprendi... (${langTag})`}
                      rows={3}
                      className="w-full resize-none rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-[15px] font-semibold outline-none transition placeholder:text-slate-400 focus:border-fuchsia-300 focus:bg-white"
                    />
                    <span className="absolute bottom-3 right-3 text-[11px] font-black text-slate-400">{composer.length}/600</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex flex-1 flex-wrap items-center gap-1 rounded-2xl bg-slate-100 p-1">
                      {(
                        [
                          { k: "public", label: "🌍 Público", hint: "Visível para toda a comunidade — sua experiência pode inspirar outra pessoa" },
                          { k: "private", label: "🔒 Privado", hint: "Só você vê — seu diário de estudos" },
                          { k: "mentor", label: "🎓 Mentores", hint: "Mentores vão corrigir e comentar sua partilha" },
                        ] as const
                      ).map((v) => (
                        <button key={v.k} onClick={() => setVisibility(v.k)} className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black transition ${visibility === v.k ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-700"}`}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={doShare} disabled={!composer.trim() || posting} className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-fuchsia-500/30 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100">
                      {posting ? "Enviando..." : "Compartilhar 🚀"}
                    </button>
                  </div>
                  <div className="mt-2 rounded-2xl bg-gradient-to-r from-sky-50 to-violet-50 px-3 py-2 text-xs font-bold text-slate-600">
                    {visibility === "public" ? "🌍 Visível para toda a comunidade — sua experiência pode inspirar outra pessoa" : visibility === "private" ? "🔒 Diário privado — só você vê essa partilha" : "🎓 Mentores vão revisar e dar feedback na sua partilha"}
                  </div>
                </div>
              </div>

              {/* FILTERS */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button onClick={() => setFilterLang("all")} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black transition ${filterLang === "all" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`}>
                  🌎 Todos
                </button>
                {LANGS.map((l) => (
                  <button key={l} onClick={() => setFilterLang(l)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black transition ${filterLang === l ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`}>
                    {LANG_FLAG[l]} {l}
                  </button>
                ))}
                <span className="ml-auto hidden whitespace-nowrap text-xs font-bold text-slate-400 sm:block">{posts.length} partilhas</span>
              </div>

              {/* FEED */}
              <div className="space-y-4">
                {posts.map((p) => (
                  <article key={p.id} className="card-ring animate-pop rounded-3xl border border-white bg-white p-5">
                    <div className="flex items-start gap-3">
                      <Avatar emoji={p.avatarEmoji} gradient={p.avatarGradient} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black">{p.userName}</span>
                          <span className="rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 px-2 py-0.5 text-[10px] font-black text-violet-700">{p.userLevel}</span>
                          {p.languageTag && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">{LANG_FLAG[p.languageTag] ?? "🌎"} {p.languageTag}</span>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                          <span>{p.visibility === "public" ? "🌍" : p.visibility === "private" ? "🔒" : "🎓"}</span>
                          <span>{fmtTime(p.createdAt)}</span>
                          {p.prompt && <span className="hidden truncate text-violet-500 sm:inline">· {p.prompt}</span>}
                        </div>
                      </div>
                      {p.userId === USER_ID && (
                        <button onClick={() => deletePost(p.id)} className="rounded-xl p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" title="Apagar">🗑️</button>
                      )}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-slate-800">{renderRich(p.content)}</p>
                    {p.imageEmoji && (
                      <div className="mt-3 grid place-items-center rounded-2xl bg-gradient-to-br from-violet-100 via-fuchsia-100 to-orange-100 py-8 text-6xl">
                        {p.imageEmoji}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      <button onClick={() => toggleComments(p.id)} className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-200">
                        💬 Responder{p.commentsCount > 0 ? ` · ${p.commentsCount}` : ""}
                      </button>
                      <button onClick={() => doReact(p.id, "clap")} className={`rounded-full px-3 py-1.5 text-xs font-black transition ${p.reactedClap ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        👏{p.claps > 0 ? ` ${p.claps}` : ""}
                      </button>
                      <button onClick={() => doReact(p.id, "heart")} className={`rounded-full px-3 py-1.5 text-xs font-black transition ${p.reactedHeart ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        ❤️{p.hearts > 0 ? ` ${p.hearts}` : ""}
                      </button>
                      <button onClick={() => doReact(p.id, "fire")} className={`rounded-full px-3 py-1.5 text-xs font-black transition ${p.reactedFire ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        🔥{p.fires > 0 ? ` ${p.fires}` : ""}
                      </button>
                    </div>
                    {expanded[p.id] && (
                      <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3">
                        {(commentsMap[p.id] ?? []).map((c) => (
                          <div key={c.id} className="flex gap-2.5 rounded-2xl bg-white p-3 shadow-sm">
                            <Avatar emoji={c.avatarEmoji} gradient={c.avatarGradient} size="sm" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black">{c.userName}</span>
                                <span className="text-[10px] font-bold text-slate-400">{fmtTime(c.createdAt)}</span>
                              </div>
                              <p className="mt-0.5 text-sm font-medium text-slate-700">{c.content}</p>
                            </div>
                          </div>
                        ))}
                        {(commentsMap[p.id] ?? []).length === 0 && <p className="px-1 py-2 text-xs font-bold text-slate-400">Seja a primeira pessoa a responder 💛</p>}
                        <div className="flex gap-2">
                          <input
                            value={commentInput[p.id] ?? ""}
                            onChange={(e) => setCommentInput((m) => ({ ...m, [p.id]: e.target.value.slice(0, 300) }))}
                            onKeyDown={(e) => e.key === "Enter" && sendComment(p.id)}
                            placeholder="Escreva uma resposta gentil..."
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-fuchsia-300"
                          />
                          <button onClick={() => sendComment(p.id)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-700">Enviar</button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
                {posts.length === 0 && (
                  <div className="grid place-items-center rounded-3xl bg-white p-12 text-center">
                    <div className="text-5xl">🌵</div>
                    <p className="mt-3 font-black">Nenhuma partilha aqui ainda</p>
                    <p className="text-sm font-semibold text-slate-500">Seja a primeira pessoa a partilhar nesse idioma!</p>
                  </div>
                )}
              </div>
            </section>

            {/* RIGHT */}
            <aside className="space-y-5 lg:col-span-2 xl:col-span-1">
              {/* PRATIQUEI HOJE */}
              <div className="relative">
                {burst && (
                  <div className="pointer-events-none absolute -top-2 left-0 right-0 z-10 flex justify-center gap-3 text-2xl">
                    {["🎉", "🔥", "⚡", "🌟", "🎊"].map((e, i) => (
                      <span key={i} style={{ animation: `confetti-fall 1.2s ease-out ${i * 0.08}s both` }}>{e}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={doCheckin}
                  disabled={dash.checkedToday || checking}
                  className={`group relative w-full overflow-hidden rounded-3xl p-[3px] shadow-xl transition hover:scale-[1.02] ${
                    dash.checkedToday ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30" : "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 shadow-fuchsia-500/30"
                  }`}
                >
                  <div className={`flex items-center justify-center gap-2.5 rounded-[21px] px-6 py-4 text-lg font-black text-white ${dash.checkedToday ? "bg-gradient-to-r from-emerald-500 to-teal-600" : "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500"}`}>
                    {!dash.checkedToday && <div className="shimmer absolute inset-0" />}
                    {dash.checkedToday ? (
                      <>
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/25 text-xl">✓</span>
                        Você praticou hoje! +20 XP
                      </>
                    ) : (
                      <>
                        <span className="animate-flame text-2xl">🔥</span>
                        {checking ? "Registrando..." : "Pratiquei hoje"}
                        <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs">+20 XP</span>
                      </>
                    )}
                  </div>
                </button>
                {!dash.checkedToday && <p className="mt-2 text-center text-xs font-bold text-slate-500">Toque para somar no card <span className="text-emerald-600">“Estudando junto”</span> 👥</p>}
              </div>

              {/* PRÓXIMO ENCONTRO */}
              <section className="card-ring overflow-hidden rounded-3xl border border-white bg-white">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-white">
                  <h2 className="text-xs font-black uppercase tracking-[0.14em]">📡 Próximo encontro ao vivo</h2>
                </div>
                {dash.nextEvent ? (
                  <div className="p-4">
                    <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${dash.nextEvent.gradient} p-4 text-white shadow-lg`}>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black backdrop-blur">{dash.nextEvent.tag}</span>
                        <span className="flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-black"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-300" /> EM BREVE</span>
                      </div>
                      <h3 className="mt-2 font-black leading-tight">{dash.nextEvent.languageFlag} {dash.nextEvent.title}</h3>
                      <p className="mt-1 text-xs font-bold text-white/85">🕐 {fmtEvent(dash.nextEvent.startsAt, dash.nextEvent.endsAt)}</p>
                      <p className="mt-1 text-xs font-bold text-white/85">{dash.nextEvent.hostEmoji} com {dash.nextEvent.host} · {dash.nextEvent.level}</p>
                    </div>
                    <p className="mt-3 line-clamp-3 text-[13px] font-semibold leading-relaxed text-slate-600">{dash.nextEvent.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {dash.nextEvent.avatars.slice(0, 5).map((a) => (
                          <div key={a.id} title={a.name} className={`grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-gradient-to-br text-xs ${a.avatarGradient}`}>{a.avatarEmoji}</div>
                        ))}
                        <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-900 text-[10px] font-black text-white">+{Math.max(0, dash.nextEvent.reservedCount - 5)}</div>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{dash.nextEvent.reservedCount} pessoas reservaram</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${Math.min((dash.nextEvent.reservedCount / dash.nextEvent.spotsTotal) * 100, 100)}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] font-black text-slate-500">{dash.nextEvent.spotsLeft} vagas restantes de {dash.nextEvent.spotsTotal}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleReserve(dash.nextEvent!.id)}
                        className={`rounded-2xl py-2.5 text-xs font-black transition ${dash.nextEvent.myReserved ? "bg-slate-900 text-white" : "bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-500/25 hover:scale-105"}`}
                      >
                        {dash.nextEvent.myReserved ? "Vaga reservada ✓" : "Reservar vaga 🎟️"}
                      </button>
                      <button onClick={() => setTab("aovivo")} className="rounded-2xl bg-slate-100 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-200">
                        Ver todos 📅
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="p-5 text-sm font-bold text-slate-500">Nenhum encontro agendado.</p>
                )}
              </section>

              {/* DESAFIOS */}
              <section className="card-ring overflow-hidden rounded-3xl border border-white bg-white">
                <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-white">
                  <h2 className="text-xs font-black uppercase tracking-[0.14em]">🎯 Desafios da semana</h2>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black">{challengesDone}/{dash.challenges.length} · {challengesTotalXp} XP</span>
                </div>
                <div className="space-y-2 p-4">
                  {dash.challenges.map((c) => (
                    <button key={c.id} onClick={() => toggleChallenge(c.id)} className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition hover:scale-[1.01] ${c.done ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50" : "border-slate-100 bg-slate-50/60 hover:border-violet-200"}`}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg shadow-sm ${c.done ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white" : "bg-white"}`}>
                        {c.done ? "✓" : c.iconEmoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-black leading-tight ${c.done ? "text-emerald-800 line-through opacity-70" : ""}`}>{c.title}</span>
                        <span className="mt-0.5 block text-xs font-semibold leading-snug text-slate-500">{c.description}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${c.done ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700"}`}>+{c.xp}</span>
                    </button>
                  ))}
                  <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-black text-slate-400">🔄 Reseta toda segunda-feira · Complete todos e ganhe bônus!</p>
                </div>
              </section>

              {/* EXPRESSÃO DA SEMANA */}
              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-5 text-white shadow-xl shadow-violet-500/25">
                <div className="absolute -right-4 -top-4 text-7xl opacity-20">💬</div>
                <h2 className="text-xs font-black uppercase tracking-[0.14em] text-white/80">✨ Expressão da semana</h2>
                {dash.phrase ? (
                  <>
                    <p className="mt-2 text-xl font-black leading-snug">“{dash.phrase.text}”</p>
                    <p className="mt-1 text-sm font-bold text-white/85">🇧🇷 {dash.phrase.translation}</p>
                    {dash.phrase.pronunciation && <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur">🔊 {dash.phrase.pronunciation}</p>}
                    <p className="mt-2 text-xs font-bold text-amber-300">— {dash.phrase.author} · {dash.phrase.language}</p>
                    {dash.phrase.context && <p className="mt-2 rounded-2xl bg-black/20 p-3 text-xs font-semibold leading-relaxed text-white/90">💡 {dash.phrase.context}</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(`"${dash.phrase!.text}" — ${dash.phrase!.translation}`);
                          pushToast("Expressão copiada!", "📋");
                        }}
                        className="rounded-2xl bg-white/15 py-2.5 text-xs font-black backdrop-blur transition hover:bg-white/25"
                      >
                        📋 Copiar
                      </button>
                      <button
                        onClick={() => {
                          setComposer(`Expressão da semana: "${dash.phrase!.text}" — ${dash.phrase!.translation} 💬`);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                          pushToast("Pronta no composer!", "✍️", "Edite e compartilhe no feed");
                        }}
                        className="rounded-2xl bg-white py-2.5 text-xs font-black text-violet-700 shadow-lg transition hover:scale-105"
                      >
                        Usar no feed 🚀
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm font-bold text-white/70">Nenhuma expressão cadastrada.</p>
                )}
              </section>
            </aside>
          </main>
        </>
      )}

      {tab === "aulas" && (
        <main className="mx-auto max-w-[1400px] px-4 pt-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-5xl">📚</div>
              <div className="min-w-[200px] flex-1">
                <h1 className="text-2xl font-black">Trilha de aulas</h1>
                <p className="text-sm font-bold text-white/80">{dash.journey.done} de {dash.journey.total} concluídas · {dash.journey.percent}% · Ganhe XP a cada aula 🎓</p>
                <div className="mt-2 h-3 max-w-md overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-400 transition-all" style={{ width: `${dash.journey.percent}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/15 p-2 backdrop-blur">
                <input value={lessonSearch} onChange={(e) => setLessonSearch(e.target.value)} placeholder="Buscar aula... 🔍" className="w-44 rounded-xl bg-white/90 px-3 py-2 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto">
              <button onClick={() => setLessonFilter("all")} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black ${lessonFilter === "all" ? "bg-white text-violet-700" : "bg-white/15 text-white"}`}>🌎 Todas</button>
              {["Inglês", "Espanhol", "Francês", "Italiano", "Alemão"].map((l) => (
                <button key={l} onClick={() => setLessonFilter(l)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black ${lessonFilter === l ? "bg-white text-violet-700" : "bg-white/15 text-white"}`}>
                  {LANG_FLAG[l]} {l}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredLessons.map((l, idx) => (
              <div key={l.id} className={`card-ring overflow-hidden rounded-3xl border bg-white transition hover:scale-[1.02] ${l.done ? "border-emerald-200" : "border-white"}`}>
                <div className={`relative bg-gradient-to-br ${l.gradient} p-4 text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-black backdrop-blur">#{String(l.orderNum).padStart(2, "0")} · {l.tag}</span>
                    {l.done && <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-[10px] font-black text-emerald-950">✓ CONCLUÍDA</span>}
                  </div>
                  <div className="mt-3 text-5xl drop-shadow-lg">{l.emoji}</div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-black text-white/90">
                    <span className="rounded-full bg-white/20 px-2 py-0.5">{l.languageFlag} {l.language}</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5">{l.level}</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5">⏱ {l.durationMin}min</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-black leading-tight">{l.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-slate-500">{l.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => toggleLesson(l)} className={`flex-1 rounded-2xl py-2.5 text-sm font-black transition ${l.done ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-900 text-white hover:bg-slate-700"}`}>
                      {l.done ? "↩ Refazer" : `▶ Começar · +${l.xp} XP`}
                    </button>
                    <span className="rounded-xl bg-amber-100 px-2.5 py-2 text-xs font-black text-amber-700">⚡{l.xp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredLessons.length === 0 && (
            <div className="mt-6 grid place-items-center rounded-3xl bg-white p-12 text-center">
              <div className="text-5xl">🔍</div>
              <p className="mt-2 font-black">Nenhuma aula encontrada</p>
            </div>
          )}
        </main>
      )}

      {tab === "aovivo" && (
        <main className="mx-auto max-w-[1100px] px-4 pt-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/20 text-4xl backdrop-blur">📡</div>
              <div>
                <h1 className="text-2xl font-black">Encontros ao vivo</h1>
                <p className="text-sm font-bold text-white/85">Pratique speaking com teachers e buddies · vagas limitadas 🎟️</p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {events.map((e) => (
              <div key={e.id} className="card-ring overflow-hidden rounded-3xl border border-white bg-white">
                <div className={`bg-gradient-to-br ${e.gradient} p-5 text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-black">{e.tag}</span>
                    <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] font-black">{e.languageFlag} {e.language} · {e.level}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-black leading-tight">{e.title}</h3>
                  <p className="mt-1 text-sm font-bold text-white/90">🕐 {fmtEvent(e.startsAt, e.endsAt)}</p>
                  <p className="text-sm font-bold text-white/90">{e.hostEmoji} {e.host} · {e.hostRole}</p>
                </div>
                <div className="p-5">
                  <p className="text-sm font-semibold leading-relaxed text-slate-600">{e.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs font-black text-slate-500">
                    <span>🎟️ {e.reservedCount}/{e.spotsTotal} reservadas</span>
                    <span>{Math.max(0, e.spotsTotal - e.reservedCount)} vagas restantes</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-600" style={{ width: `${Math.min((e.reservedCount / e.spotsTotal) * 100, 100)}%` }} />
                  </div>
                  <button onClick={() => toggleReserve(e.id)} className={`mt-4 w-full rounded-2xl py-3 text-sm font-black transition hover:scale-[1.02] ${e.myReserved ? "bg-slate-900 text-white" : "bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-500/25"}`}>
                    {e.myReserved ? "✓ Vaga reservada — clique para cancelar" : "🎟️ Reservar minha vaga"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* TOASTS */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="animate-pop flex items-center gap-3 rounded-2xl border border-white/40 bg-slate-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl">{t.emoji}</span>
            <div>
              <div className="text-sm font-black">{t.title}</div>
              {t.sub && <div className="text-xs font-bold text-white/70">{t.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <footer className="mx-auto mt-10 max-w-[1400px] px-4 text-center">
        <p className="text-xs font-bold text-slate-400">LinguaLoop 🌍 · Feito para quem aprende junto · Practice makes progress 💜</p>
      </footer>
    </div>
  );
}
