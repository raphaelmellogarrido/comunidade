import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessons, lessonCompletions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId") || "1");
  const rows = await db.execute(sql`
    select l.*, exists(select 1 from lesson_completions c where c.lesson_id = l.id and c.user_id = ${userId}) as done
    from lessons l order by l.order_num asc
  `);
  return NextResponse.json({ lessons: rows.rows });
}
