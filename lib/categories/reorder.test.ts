import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCategoryReorderAuthorization,
  validateOrderedCategoryIds,
} from "./reorder.ts";

test("validateOrderedCategoryIds accepts valid payload", () => {
  const result = validateOrderedCategoryIds(["a", "b", "c"]);
  assert.deepEqual(result, ["a", "b", "c"]);
});

test("validateOrderedCategoryIds rejects duplicates", () => {
  assert.throws(
    () => validateOrderedCategoryIds(["a", "a"]),
    /contains duplicates/,
  );
});

test("assertCategoryReorderAuthorization enforces ownership", () => {
  assert.throws(
    () =>
      assertCategoryReorderAuthorization(
        ["global-cat", "other-user-cat"],
        [
          { id: "global-cat", userId: null },
          { id: "other-user-cat", userId: "other-user" },
        ],
        "current-user",
      ),
    /Not authorized/,
  );
});

test("assertCategoryReorderAuthorization allows global and own categories", () => {
  assert.doesNotThrow(() =>
    assertCategoryReorderAuthorization(
      ["global-cat", "my-cat"],
      [
        { id: "global-cat", userId: null },
        { id: "my-cat", userId: "current-user" },
      ],
      "current-user",
    ),
  );
});
