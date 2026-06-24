import type { CareerMapData } from "./types";

export const SAVED_MAP_ID_KEY = "pathin-generated-map-id";
export const SAVED_MAP_SNAPSHOT_KEY = "pathin-generated-map-snapshot";

export type SavedMapSnapshot = {
  map: CareerMapData;
  savedAt: string;
};

export function writeSavedMapSnapshot(
  map: CareerMapData,
  savedAt: string,
  storage: Storage = window.localStorage,
) {
  const snapshot: SavedMapSnapshot = {
    map,
    savedAt,
  };
  storage.setItem(SAVED_MAP_ID_KEY, map.id);
  storage.setItem(SAVED_MAP_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function readSavedMapSnapshot(
  storage: Storage = window.localStorage,
): SavedMapSnapshot | null {
  const serialized = storage.getItem(SAVED_MAP_SNAPSHOT_KEY);
  if (!serialized) {
    return null;
  }

  try {
    const snapshot = JSON.parse(serialized) as Partial<SavedMapSnapshot>;
    if (
      !snapshot.map ||
      typeof snapshot.map !== "object" ||
      typeof snapshot.map.id !== "string" ||
      typeof snapshot.savedAt !== "string"
    ) {
      throw new Error("Invalid saved map snapshot.");
    }
    return snapshot as SavedMapSnapshot;
  } catch {
    storage.removeItem(SAVED_MAP_SNAPSHOT_KEY);
    return null;
  }
}
