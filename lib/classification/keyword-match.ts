import { normalizeForMatch } from "./keyword-classifier.ts";
import type { Prisma } from "@prisma/client";

export function normalizeKeywordForRecategorization(keyword: string): string {
  return normalizeForMatch(keyword);
}

export function descriptionMatchesKeyword(
  description: string,
  normalizedKeyword: string,
): boolean {
  return normalizeForMatch(description).includes(normalizedKeyword);
}

type CandidateWhereInput = {
  userId: string;
  categoryId: string;
  normalizedKeyword: string;
};

export function buildKeywordRecategorizationCandidateWhere(
  input: CandidateWhereInput,
): Prisma.TransactionWhereInput {
  return {
    userId: input.userId,
    manuallyOverridden: false,
    NOT: { categoryId: input.categoryId },
    description: { contains: input.normalizedKeyword },
  };
}
