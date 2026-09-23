import { NextResponse } from "next/server";
import { MASTER_CHALLENGES } from "@/data/challenges";

export async function GET() {
  return NextResponse.json(MASTER_CHALLENGES);
}
