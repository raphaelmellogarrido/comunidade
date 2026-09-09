import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId") || "1");
  const rows = await db.execute(sql`
    select e.*, (select count(*)::int from reservations r where r.event_id = e.id) as "reservedCount",
      exists(select 1 from reservations r where r.event_id = e.id and r.user_id = ${userId}) as "myReserved"
    from live_events e order by e.starts_at asc
  `);
  return NextResponse.json({ events: rows.rows });
}
