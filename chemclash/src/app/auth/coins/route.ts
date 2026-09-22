/**
 * POST /auth/coins
 * Adjusts ChemCoin balance (earn or spend).
 * Body: { delta: number; reward_id?: string }
 *
 * delta > 0 → earn coins
 * delta < 0 → spend coins (optionally purchasing a reward_id)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountsStore, AccountDoc } from "@/lib/db";
import { extractToken, decodeToken } from "@/lib/jwt";

function publicAccount(doc: AccountDoc) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...pub } = doc;
  return pub;
}

async function requireAuth(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return null;
  const userId = await decodeToken(token);
  if (!userId) return null;
  const store = await getAccountsStore();
  return store.findById(userId);
}

export async function POST(req: NextRequest) {
  const account = await requireAuth(req);
  if (!account) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  let body: { delta?: number; reward_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const delta = typeof body.delta === "number" ? body.delta : 0;
  const rewardId = body.reward_id ?? null;

  const current = account.chem_coins ?? 0;
  const newBalance = current + delta;

  if (newBalance < 0) {
    return NextResponse.json(
      { detail: `Insufficient ChemCoins (have ${current}, need ${-delta}).` },
      { status: 402 }
    );
  }

  const owned: string[] = [...(account.owned_rewards ?? [])];
  if (rewardId && delta < 0) {
    if (owned.includes(rewardId)) {
      return NextResponse.json({ detail: "Reward already owned." }, { status: 409 });
    }
    owned.push(rewardId);
  }

  const patch: Partial<AccountDoc> = { chem_coins: newBalance };
  if (rewardId && delta < 0) patch.owned_rewards = owned;

  const store = await getAccountsStore();
  const updated = await store.update(account.user_id, patch);
  return NextResponse.json(publicAccount(updated ?? { ...account, ...patch }));
}
