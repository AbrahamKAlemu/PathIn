import type { CareerMapData, PitCourse, PitJob, PitMember } from "./types";
import { createCareerMap } from "./career-map-data";

const PIT_BASE_URL = "https://pit.najera.cc";

type ApiMapBootstrap = {
  id: string;
  destinationIds: string[];
  paths: Array<{ id: string }>;
  navigator?: CareerMapData["navigator"];
  source: {
    name: string;
    url: string;
    status: "live" | "snapshot";
    memberCount: number;
    jobCount: number;
    courseCount: number;
    cohortCount: number;
    note: string;
  };
  generation: {
    dataVersion: string;
    modelVersion: string;
    promptVersion: string;
    generatedAt: string;
  };
};

async function fetchDataset<T>(path: string): Promise<T> {
  const response = await fetch(`${PIT_BASE_URL}${path}`, {
    signal: AbortSignal.timeout(8000),
    next: {
      revalidate: 86400,
    },
  });

  if (!response.ok) {
    throw new Error(`PIT dataset request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchBackendMap(apiUrl: string): Promise<CareerMapData> {
  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/api/v1/maps/demo`,
    {
      signal: AbortSignal.timeout(5000),
      next: {
        revalidate: 3600,
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Path[IN] API request failed with ${response.status}`);
  }

  const bootstrap = (await response.json()) as ApiMapBootstrap;
  const map = createCareerMap(undefined, bootstrap.generation.generatedAt);
  const validPathIds = bootstrap.paths
    .map((path) => path.id)
    .filter((pathId) => map.paths.some((path) => path.id === pathId));
  const validDestinationIds = bootstrap.destinationIds.filter((destinationId) =>
    map.destinationIds.includes(destinationId),
  );

  return {
    ...map,
    id: bootstrap.id,
    explorePathIds:
      validPathIds.length > 0 ? validPathIds : map.explorePathIds,
    destinationIds:
      validDestinationIds.length > 0
        ? validDestinationIds
        : map.destinationIds,
    navigator: bootstrap.navigator,
    source: {
      ...bootstrap.source,
      fetchedAt: bootstrap.generation.generatedAt,
    },
    generation: {
      dataVersion: bootstrap.generation.dataVersion,
      modelVersion: bootstrap.generation.modelVersion,
      promptVersion: bootstrap.generation.promptVersion,
    },
  };
}

export async function getPitCareerMap(): Promise<CareerMapData> {
  const apiUrl =
    process.env.PATHIN_API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      return await fetchBackendMap(apiUrl);
    } catch {
      // The public PIT source and deterministic snapshot remain available.
    }
  }

  try {
    const [members, jobs, courses] = await Promise.all([
      fetchDataset<PitMember[]>("/user_data.json"),
      fetchDataset<PitJob[]>("/jobs_data.json"),
      fetchDataset<PitCourse[]>("/course_data.json"),
    ]);

    return createCareerMap(
      {
        members,
        jobs,
        courses,
      },
      new Date().toISOString(),
    );
  } catch {
    return createCareerMap();
  }
}
