type CategoryOwnershipRow = {
  id: string;
  userId: string | null;
};

export function validateOrderedCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("orderedCategoryIds must be a non-empty array");
  }

  const uniqueIds = new Set<string>();
  for (const id of value) {
    if (typeof id !== "string" || !id.trim()) {
      throw new Error("All category IDs must be non-empty strings");
    }
    if (uniqueIds.has(id)) {
      throw new Error("orderedCategoryIds contains duplicates");
    }
    uniqueIds.add(id);
  }

  return value;
}

export function assertCategoryReorderAuthorization(
  orderedCategoryIds: string[],
  rows: CategoryOwnershipRow[],
  userId: string,
): void {
  if (rows.length !== orderedCategoryIds.length) {
    throw new Error("One or more categories were not found");
  }

  const unauthorized = rows.some(
    (category) => category.userId !== null && category.userId !== userId,
  );
  if (unauthorized) {
    throw new Error("Not authorized to reorder these categories");
  }
}
