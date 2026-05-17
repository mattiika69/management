import { NextResponse } from "next/server";
import { getAdminOverviewData } from "@/lib/admin/data";
import { adminJsonError, requireAdminForApi } from "@/lib/admin/require-admin";

export async function GET() {
  try {
    const session = await requireAdminForApi();
    const data = await getAdminOverviewData(session);
    return NextResponse.json(data);
  } catch (error) {
    return adminJsonError(error);
  }
}
