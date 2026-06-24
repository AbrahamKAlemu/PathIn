import { describe, expect, it } from "vitest";

import { createCareerMap } from "./career-map-data";
import {
  readSavedMapSnapshot,
  SAVED_MAP_ID_KEY,
  SAVED_MAP_SNAPSHOT_KEY,
  writeSavedMapSnapshot,
} from "./saved-map-storage";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("saved map storage", () => {
  it("stores and restores the complete generated map", () => {
    const storage = createStorage();
    const map = createCareerMap();
    const savedAt = "2026-06-24T08:00:00.000Z";

    writeSavedMapSnapshot(map, savedAt, storage);

    expect(storage.getItem(SAVED_MAP_ID_KEY)).toBe(map.id);
    expect(readSavedMapSnapshot(storage)).toEqual({ map, savedAt });
  });

  it("removes an unreadable browser snapshot", () => {
    const storage = createStorage();
    storage.setItem(SAVED_MAP_SNAPSHOT_KEY, "{not-json");

    expect(readSavedMapSnapshot(storage)).toBeNull();
    expect(storage.getItem(SAVED_MAP_SNAPSHOT_KEY)).toBeNull();
  });
});
