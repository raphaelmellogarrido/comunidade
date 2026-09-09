import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId") || "1");
  const rows = await db.execute(sql`
    select c.*, coalesce(p.done, false) as done
    from challenges c left join challenge_progress p on p.challenge_id = c.id and p.user_id = ${userId}
    order by c.id asc
  `);
  return NextResponse.json({ challenges: rows.rows });
}
