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

const PRIMARY_MODULES: CurriculumModuleRaw[] = (conceptTreeData as CurriculumModuleRaw[]).slice(0, 17);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get("difficulty");

  let list = PRIMARY_MODULES;
  if (difficulty && difficulty !== "all") {
    list = list.filter((m) => m.difficulty === difficulty.toLowerCase());
  }

  const summaries = list.map((m) => ({
    module_id: m.module_id,
    title: m.title,
    difficulty: m.difficulty,
    difficulty_tier: m.difficulty_tier,
    game_tags: m.game_tags,
    slide_count: m.tutorial_sequence.length,
  }));

  return NextResponse.json(summaries);
}
