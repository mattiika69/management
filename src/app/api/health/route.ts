import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "HyperOptimal Management",
    time: new Date().toISOString(),
  });
}
