import { NextRequest, NextResponse } from "next/server";
import conceptTreeData from "@/data/concept_tree.json";

interface CurriculumModuleRaw {
  module_id: string;
  title: string;
  difficulty: "basics" | "medium" | "advanced";
  difficulty_tier: number;
  game_tags: string[];
  tutorial_sequence: Array<{
    slide: number;
    concept_term: string;
    short_definition: string;
    action_prompt: string;
  }>;
}

const MODULES_MAP: Record<string, CurriculumModuleRaw> = Object.fromEntries(
  (conceptTreeData as CurriculumModuleRaw[]).map((m) => [m.module_id, m])
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mod = MODULES_MAP[id];
  if (!mod) {
    return NextResponse.json({ detail: `Module '${id}' not found` }, { status: 404 });
  }
  return NextResponse.json(mod);
}
