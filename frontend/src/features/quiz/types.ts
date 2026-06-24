export type Role = {
  role_id: string;
  role: string;
  industry: string;
  shape: string;
};

export type Scenario = {
  role_id: string;
  role: string;
  industry: string;
  shape: string;
  setup: string;
  opener: string;
  skip_offer: string;
  follow_ups: string[];
  closer_reflection: string;
  closer_rating: string;
};

export type UserProfile = {
  stage: "high_school" | "college" | "both";
  grade?: string;
  existing_activities?: string[];
  skills?: string[];
};

export type ScenarioResponse = {
  role: string;
  industry: string;
  rating: number;
  skip_count: number;
  transcript: string;
  followups: { enjoyed?: string; disliked?: string };
};

export type Suggestion = {
  id: string;
  type: "scholarship" | "club" | "course" | "internship" | "outreach";
  industry: string;
  title: string;
  stage: string;
  deadline: string;
  location: string;
  requirements: string[];
  details: Record<string, unknown>;
};

export type Direction = {
  industry: string;
  role: string;
  role_id: string | null;
  readiness: string;
  why: string;
};

// The adaptive profile is opaque to the frontend — we store it and send it back.
export type QuizProfile = Record<string, unknown>;

export type SuggestionResult = {
  direction?: Direction;
  actions?: Suggestion[];
  profile: QuizProfile;
  error?: string;
  message?: string;
};
