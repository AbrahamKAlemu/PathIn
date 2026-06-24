import type {
  ParsedProfileField,
  ProfileCategory,
} from "@/features/pathin/types";

export type ProfileAffiliation = {
  id: string;
  name: string;
  logo: string;
};

export type ProfileActivity = {
  id: string;
  kind: "comment" | "post";
  age: string;
  text: string;
};

export type ProfileExperience = {
  id: string;
  title: string;
  company: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  duration: string;
  location: string;
  description: string[];
  logo: string;
};

export type ProfileEducation = {
  id: string;
  school: string;
  degree: string;
  dates: string;
  description: string[];
  logo: string;
};

export type ProfileSkill = {
  id: string;
  name: string;
  endorsementCount: number;
  endorsementNotes: string[];
};

export type ProfileHonor = {
  id: string;
  name: string;
  issuer: string;
  issued: string;
};

export type ProfilePerson = {
  id: string;
  name: string;
  relationship: string;
  headline: string;
  initials: string;
};

export type ProfileInterestItem = {
  id: string;
  tab: string;
  name: string;
  relationship: string;
  headline: string;
  followers: string;
};

export type SuggestedPage = {
  id: string;
  name: string;
  industry: string;
  followers: string;
  context: string;
  initials: string;
};

export type CurrentProfile = {
  id: string;
  slug: string;
  name: string;
  headline: string;
  location: string;
  connectionCount: string;
  followerCount: number;
  profileLanguage: string;
  publicUrl: string;
  profilePhoto: string;
  cover: {
    kind: "solid";
    value: string;
  };
  affiliations: ProfileAffiliation[];
  analytics: {
    profileViews: number;
    postImpressions: number;
    searchAppearances: number;
    period: string;
  };
  activity: ProfileActivity[];
  experience: ProfileExperience[];
  education: ProfileEducation[];
  connectedApps: Array<{
    id: string;
    name: string;
    mark: string;
  }>;
  skills: ProfileSkill[];
  skillCount: number;
  recommendations: {
    receivedCount: number;
    givenCount: number;
    receivedVisible: boolean;
  };
  honors: ProfileHonor[];
  honorCount: number;
  interests: {
    activeTab: string;
    tabs: string[];
    items: ProfileInterestItem[];
  };
  viewerSuggestions: ProfilePerson[];
  peopleYouMayKnow: ProfilePerson[];
  suggestedPages: SuggestedPage[];
  projects: string[];
  industries: string[];
  careerInterests: string[];
  careerGoals: string[];
  workStyles: string[];
  enabledCategories: Record<ProfileCategory, boolean>;
  provenance: {
    source: string;
    authorized: boolean;
    scraped: boolean;
    description: string;
  };
  schemaVersion: string;
  updatedAt: string;
  pathinEvidence: {
    fields: Record<ProfileCategory, ParsedProfileField[]>;
    enabledCategories: Record<ProfileCategory, boolean>;
    source: "linkedin";
    sourceLabel: string;
    privacy: string;
  };
};

export type CurrentProfilePatch = Partial<
  Pick<
    CurrentProfile,
    | "name"
    | "headline"
    | "location"
    | "profileLanguage"
    | "publicUrl"
    | "experience"
    | "education"
    | "skills"
    | "honors"
    | "careerInterests"
    | "careerGoals"
    | "workStyles"
    | "enabledCategories"
  >
>;
