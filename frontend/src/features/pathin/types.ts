export type CareerMode = "explore" | "build";

export type CareerNodeType =
  | "current"
  | "course"
  | "skill"
  | "experience"
  | "entry_role"
  | "role"
  | "destination";

export type EvidenceLevel = "strong" | "moderate" | "limited" | "inferred";

export type DetailSection =
  | "overview"
  | "fit"
  | "skills"
  | "connections"
  | "evidence";

export type CareerNode = {
  id: string;
  type: CareerNodeType;
  label: string;
  eyebrow: string;
  summary: string;
  stage: string;
  workSetting: string;
  whyItFits: string[];
  responsibilities: string[];
  existingSkills: string[];
  transferableSkills: string[];
  skillsToBuild: string[];
  preview: string;
  challenges: string[];
  sourceRecord?: {
    id: string;
    kind: "course" | "job" | "profile" | "prototype";
    label: string;
  };
  market?: {
    postingCount: number;
    averageSalaryFrom: number;
    averageSalaryTo: number;
    locations: string[];
  };
};

export type CareerEdge = {
  id: string;
  source: string;
  target: string;
  type:
    | "observed_transition"
    | "recommended_transition"
    | "skill_bridge"
    | "helpful_preparation"
    | "alternative";
  evidenceLevel: EvidenceLevel;
  explanation: string;
  observedCount?: number;
  evidenceLabel: string;
};

export type CareerPath = {
  id: string;
  label: string;
  shortLabel: string;
  destinationId: string;
  nodeIds: string[];
  description: string;
  strategy: string;
};

export type PathInProfile = {
  name: string;
  headline: string;
  location: string;
  education: string[];
  experience: string[];
  skills: string[];
  interests: string[];
};

export type CareerMapData = {
  id: string;
  disclaimer: string;
  profile: PathInProfile;
  nodes: CareerNode[];
  edges: CareerEdge[];
  paths: CareerPath[];
  explorePathIds: string[];
  buildPathIdsByDestination: Record<string, string[]>;
  destinationIds: string[];
  source: {
    name: string;
    url: string;
    fetchedAt: string;
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
  };
};

export type PitSchool = {
  school_name: string;
  degree: string;
  graduation_year: number;
};

export type PitMember = {
  id: string;
  name: string;
  school_history: PitSchool[];
  job_history: string[];
  current_location: string;
  posts_activity: string[];
  skills: string[];
  courses: string[];
};

export type PitJob = {
  id: string;
  company: string;
  location: string;
  position: string;
  salary_range: {
    from: string;
    to: string;
  };
  industry: string;
  level: "Entry" | "Mid" | "Senior" | "Management";
  easy_apply: boolean;
  description: string;
};

export type PitCourse = {
  id: string;
  name: string;
  category: string;
  skills: string[];
  length: {
    value: number;
    unit: string;
  };
  level: "Easy" | "Medium" | "Hard";
};

export type PitDataset = {
  members: PitMember[];
  jobs: PitJob[];
  courses: PitCourse[];
};
