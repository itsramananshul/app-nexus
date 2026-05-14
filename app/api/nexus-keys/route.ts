import { NextResponse } from "next/server";
import {
  ACTIVE_CLIENT_KEYS_TABLE,
  NEXUS_APP_TYPE,
  getSupabase,
} from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
} as const;

export const dynamic = "force-dynamic";

// GET — returns { keys: { [nodeId]: rawKey } } for every node Nexus knows about.
// PUBLIC. Same reasoning as /api/keys on the backend apps — anyone with the URL
// can read the saved keys. That's a deliberate trade-off for the demo.
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(ACTIVE_CLIENT_KEYS_TABLE)
      .select("instance_name, raw_key")
      .eq("app_type", NEXUS_APP_TYPE);

    if (error) {
      // Fail soft — the UI just shows "no keys" and prompts the user.
      return NextResponse.json(
        { keys: {}, error: error.message },
        { status: 200, headers: CORS_HEADERS },
      );
    }

    const keys: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{
      instance_name: string;
      raw_key: string;
    }>) {
      keys[row.instance_name] = row.raw_key;
    }
    return NextResponse.json({ keys }, { headers: CORS_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load keys";
    return NextResponse.json(
      { keys: {}, error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
