export type Role = {
  role_id: string;
  role: string;
  industry: string;
  shape: string;
};

export type Scenario = Role & {
  setup: string;
  opener: string;
  skip_offer: string;
  follow_ups: string[];
  closer_reflection: string;
  closer_rating: string;
};

export type QuizUserProfile = {
  name?: string;
  headline?: string;
  location?: string;
  stage: "high_school" | "college" | "both";
  education: string[];
  experience: string[];
  skills: string[];
  interests: string[];
  goals: string[];
  existing_activities: string[];
};

export type ScenarioResponse = {
  role_id: string;
  role: string;
  industry: string;
  rating: number;
  skip_count: number;
  transcript: string;
  followups: {
    enjoyed?: string;
    disliked?: string;
  };
};

export type Suggestion = {
  id: string;
  type:
    | "scholarship"
    | "club"
    | "course"
    | "internship"
    | "outreach"
    | "project";
  industry: string;
  title: string;
  stage: string;
  deadline: string;
  location: string;
  requirements: string[];
  details: Record<string, unknown>;
  prototype: boolean;
  verification: string;
};

export type Direction = {
  industry: string;
  role: string;
  role_id: string;
  readiness: "explore" | "build-skills" | "gain-experience" | "apply";
  why: string;
  fit_score: number;
  fit_label: string;
  confidence: "low" | "medium" | "high";
  strengths: string[];
  gaps: string[];
};

export type ExploredRole = {
  role_id: string;
  role: string;
  industry: string;
  sessions_seen: number;
  fit_score: number;
  last_rating: number;
  last_skip_count: number;
  confidence: "low" | "medium" | "high";
};

export type QuizProfile = {
  schema_version: number;
  generated_at: string;
  best_fit: {
    industry: string;
    role: string;
    role_id: string;
    readiness: Direction["readiness"];
    why: string;
    confidence: Direction["confidence"];
    fit_score: number;
  };
  strengths: string[];
  gaps: string[];
  roles_explored: ExploredRole[];
};

export type SuggestionResult = {
  direction: Direction;
  actions: Suggestion[];
  profile: QuizProfile;
  analysis_mode: "ai" | "rules";
};
