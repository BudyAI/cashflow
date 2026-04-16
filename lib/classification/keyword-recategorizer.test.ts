import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKeywordRecategorizationCandidateWhere,
  descriptionMatchesKeyword,
  normalizeKeywordForRecategorization,
} from "./keyword-match.ts";

test("normalizeKeywordForRecategorization normalizes whitespace and case", () => {
  const normalized = normalizeKeywordForRecategorization("  STARBUCKS   COFFEE ");
  assert.equal(normalized, "starbucks coffee");
});

test("descriptionMatchesKeyword matches normalized descriptions", () => {
  const matches = descriptionMatchesKeyword(
    "STARBUCKS    COFFEE #123",
    "starbucks coffee",
  );
  assert.equal(matches, true);
});

test("descriptionMatchesKeyword does not match unrelated descriptions", () => {
  const matches = descriptionMatchesKeyword(
    "whole foods market",
    "starbucks coffee",
  );
  assert.equal(matches, false);
});

test("candidate filter excludes manual overrides and existing category", () => {
  const where = buildKeywordRecategorizationCandidateWhere({
    userId: "user-1",
    categoryId: "category-1",
    normalizedKeyword: "starbucks",
  });

  assert.equal(where.userId, "user-1");
  assert.equal(where.manuallyOverridden, false);
  assert.deepEqual(where.NOT, { categoryId: "category-1" });
  assert.deepEqual(where.description, { contains: "starbucks" });
});
