import { NextResponse } from "next/server";
import { mockDashboardData } from "../../../admin/mockDashboardData";
import { withDerivedDashboardFields } from "../../../admin/utils";

export async function GET() {
  // Phase 5 hook point: replace mockDashboardData with real Prisma-backed aggregates.
  const data = withDerivedDashboardFields(mockDashboardData);
  return NextResponse.json(data);
}

