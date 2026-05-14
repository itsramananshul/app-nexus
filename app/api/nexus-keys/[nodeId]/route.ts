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

// PUT { rawKey: string } — upsert the key for a node.
// PUBLIC — see /api/nexus-keys/route.ts for rationale.
export async function PUT(
  request: Request,
  { params }: { params: { nodeId: string } },
) {
  const nodeId = params.nodeId?.trim();
  if (!nodeId) {
    return NextResponse.json(
      { error: "nodeId is required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  let body: { rawKey?: unknown } | null = null;
  try {
    body = (await request.json()) as { rawKey?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (
    !body ||
    typeof body.rawKey !== "string" ||
    body.rawKey.trim() === ""
  ) {
    return NextResponse.json(
      { error: "rawKey is required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from(ACTIVE_CLIENT_KEYS_TABLE).upsert(
      {
        app_type: NEXUS_APP_TYPE,
        instance_name: nodeId,
        raw_key: body.rawKey.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "app_type,instance_name" },
    );
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save key";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

// DELETE — remove the key for a node.
export async function DELETE(
  _request: Request,
  { params }: { params: { nodeId: string } },
) {
  const nodeId = params.nodeId?.trim();
  if (!nodeId) {
    return NextResponse.json(
      { error: "nodeId is required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(ACTIVE_CLIENT_KEYS_TABLE)
      .delete()
      .eq("app_type", NEXUS_APP_TYPE)
      .eq("instance_name", nodeId);
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to clear key";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
