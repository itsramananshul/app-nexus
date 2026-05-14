import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { seedAll } from "@/lib/seed-data";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
} as const;

export const dynamic = "force-dynamic";
export const maxDuration = 30; // allow up to 30s for the clear+insert cycle

// POST — clears all 6 demo tables and re-seeds them with the canonical Ford
// dataset. Used by the "↺ Reset Demo" button in the TopBar before a pitch.
// PUBLIC — no auth. Same reasoning as the other Nexus routes.
export async function POST() {
  try {
    const supabase = getSupabase();
    const result = await seedAll(supabase);
    return NextResponse.json(
      { success: true, rowsInserted: result.total, breakdown: result },
      { headers: CORS_HEADERS },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reset failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
