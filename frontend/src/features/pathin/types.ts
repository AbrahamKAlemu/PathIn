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
    kind:
      | "course"
      | "job"
      | "profile"
      | "prototype"
      | "taxonomy"
      | "generated";
    label: string;
  };
  market?: {
    postingCount: number;
    averageSalaryFrom: number;
    averageSalaryTo: number;
    locations: string[];
    industries?: string[];
    levels?: string[];
    source?: string;
  };
  roleId?: string;
  evidence?: {
    enabledSignals?: string[];
    completeness?: number;
  };
  stepDetails?: {
    why: string;
    support: string;
    skillsDeveloped: string[];
    gapAddressed: string;
    requirement: "optional" | "recommended" | "necessary";
    effort: string;
    completionEvidence: string;
    supportingEvidence?: ProfileEvidence[];
    sourceBlend?: string;
  };
  recommendation?: CareerRecommendation;
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
  privacyStatus?: "approved" | "suppressed" | "not_applicable";
  cohortSizeBucket?: "20_plus" | "below_20" | "not_applicable";
};

export type CareerPath = {
  id: string;
  label: string;
  shortLabel: string;
  destinationId: string;
  nodeIds: string[];
  description: string;
  strategy: string;
  estimatedEffort?: string;
};

export type PathInProfile = {
  name: string;
  headline: string;
  location: string;
  education: string[];
  roles?: string[];
  responsibilities?: string[];
  experience: string[];
  skills: string[];
  interests: string[];
  goals?: string[];
};

export type ScoreComponent = {
  score: number;
  weight: number;
  contribution: number;
};

export type ProfileEvidence = {
  category: string;
  value: string;
  source: ProfileSource;
  confidence: number;
  explicit: boolean;
  corroboratedBy?: ProfileSource[];
};

export type CareerRecommendation = {
  id: string;
  destinationId: string;
  title: string;
  canonicalRole: string;
  personalizedTitle: string;
  specialization: string;
  targetIndustryOrDomain: string | null;
  targetProblem: string | null;
  careerHorizon: string;
  careerPosition:
    | "ready_now"
    | "next_move"
    | "longer_term"
    | "north_star";
  personalizationEvidence: ProfileEvidence[];
  careerThesis: string;
  sourceBlend: string;
  aspirationSource: "inferred" | "user_selected";
  isDreamCareer: boolean;
  family: string;
  rank: number;
  overallScore: number;
  componentScores: Record<string, ScoreComponent>;
  confidence: "strong" | "moderate" | "limited" | "exploratory";
  transitionDifficulty: "lower" | "moderate" | "high";
  matchStage:
    | "qualified_now"
    | "realistic_next_move"
    | "longer_term_path";
  explanation: string;
  topMatchingSignals: ProfileEvidence[];
  matches: string[];
  transferableSkills: string[];
  gaps: string[];
  constraintsApplied: string[];
  uncertainty: string;
  seniorityPenalty: number;
  seniorityReason: string;
  historicalEvidence: {
    status: "approved" | "suppressed" | "not_observed";
    strength: "strong" | "moderate" | "limited";
    cohortSizeBucket: string;
    frequencyBucket: string;
    explanation: string;
  };
  sourceStrength: {
    profileFit: string;
    marketEvidence: string;
    taxonomyInference: string;
    historicalEvidence: string;
  };
  catalogSource: "pit" | "taxonomy";
  description: string;
  responsibilities: string[];
  skills: string[];
  workStyles: string[];
  market?: CareerNode["market"];
  alternativeRoleFamilies: string[];
};

export type ProfileFingerprint = {
  sourcesPresent: ProfileSource[];
  sourceCoverage: Partial<Record<ProfileSource, number>>;
  roleTrajectory: ProfileEvidence[];
  strongestCapabilities: ProfileEvidence[];
  repeatedActivities: ProfileEvidence[];
  projectThemes: ProfileEvidence[];
  achievements: ProfileEvidence[];
  domains: Array<{
    label: string;
    strength: number;
    supportingEvidence: ProfileEvidence[];
  }>;
  problemThemes: Array<{
    label: string;
    strength: number;
    supportingEvidence: ProfileEvidence[];
  }>;
  capabilityCombination: string[];
  evidenceQuality: {
    score: number;
    label: "strong" | "moderate" | "limited";
    explicitFactCount: number;
    corroboratedFactCount: number;
    sourceCount: number;
  };
};

export type DreamCareer = {
  destinationId: string;
  personalizedDreamTitle: string;
  canonicalRole: string;
  specialization: string;
  targetIndustryOrDomain: string | null;
  targetProblem: string | null;
  careerHorizon: string;
  careerThesis: string;
  supportingEvidence: ProfileEvidence[];
  currentAdvantages: string[];
  criticalGaps: string[];
  intermediateRoles: string[];
  personalizedMilestones: Array<{
    label: string;
    outcome: string;
    groundedIn: ProfileEvidence[];
  }>;
  confidence: CareerRecommendation["confidence"];
  uncertainty: string;
  sourceBlend: string;
  aspirationSource: "inferred" | "user_selected";
};

export type CareerMapData = {
  id: string;
  name?: string;
  mode?: CareerMode;
  disclaimer: string;
  profile: PathInProfile;
  profileSnapshot?: NormalizedProfile;
  profileFingerprint?: ProfileFingerprint;
  profileSummary?: string;
  dreamCareer?: DreamCareer;
  rankedDestinations?: CareerRecommendation[];
  nodes: CareerNode[];
  edges: CareerEdge[];
  paths: CareerPath[];
  explorePathIds: string[];
  buildPathIdsByDestination: Record<string, string[]>;
  destinationIds: string[];
  pinnedNodeIds?: string[];
  dismissedNodeIds?: string[];
  enabledSignals?: string[];
  exactSignalsUsed?: Record<string, ParsedProfileField[]>;
  generationConstraints?: Record<string, unknown>;
  warnings?: string[];
  navigator?: NavigatorData;
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
    taxonomyVersion?: string;
    modelVersion: string;
    algorithmVersion?: string;
    promptVersion: string;
    requestFingerprint?: string;
    generatedAt?: string;
  };
};

export type ProfileSource =
  | "resume"
  | "linkedin"
  | "manual"
  | "profile"
  | "user_correction"
  | "inferred";

export type ProfileCategory =
  | "education"
  | "coursework"
  | "roles"
  | "responsibilities"
  | "dates"
  | "projects"
  | "skills"
  | "certifications"
  | "industries"
  | "achievements"
  | "interests"
  | "locations"
  | "goals"
  | "workStyles";

export type ParsedProfileField = {
  id: string;
  value: string;
  normalized?: string;
  source: ProfileSource;
  confidence: number;
  explicit: boolean;
  enabled: boolean;
  evidence?: string;
  originalSource?: string;
  importBatch?: string;
};

export type ParsedProfile = {
  file: {
    displayName: string;
    format: "pdf" | "docx" | "txt" | "png" | "jpeg";
    sizeBytes: number;
    sha256: string;
    retention: string;
  };
  identity?: {
    name: string;
    location: string;
  };
  fields: Partial<Record<ProfileCategory, ParsedProfileField[]>>;
  summary: {
    characterCount: number;
    fieldCount: number;
    explicitFactCount: number;
    inferredSkillCount: number;
  };
  warnings: string[];
};

export type NormalizedProfile = {
  id: string;
  name: string;
  headline: string;
  education: string[];
  coursework: string[];
  roles: string[];
  responsibilities: string[];
  dates: string[];
  experience: string[];
  projects: string[];
  skills: string[];
  certifications: string[];
  industries: string[];
  achievements: string[];
  interests: string[];
  locations: string[];
  goals: string[];
  workStyles: string[];
  locationPreferences: string[];
  preferences: Record<string, unknown>;
  constraints: Record<string, unknown>;
  exclusions: string[];
  trainingTime: string;
  desiredDifficulty: string;
  enabledCategories: Record<ProfileCategory, boolean>;
  enabledSignals: ProfileCategory[];
  fieldEvidence: Record<ProfileCategory, ParsedProfileField[]>;
  disabledFieldEvidence: Record<ProfileCategory, ParsedProfileField[]>;
  conflicts: Array<{
    category: string;
    message: string;
    values: unknown;
  }>;
  profileFingerprint?: ProfileFingerprint;
  completeness: number;
  warnings: string[];
};

export type ProfileSubmission = {
  name: string;
  headline: string;
  fields: Record<ProfileCategory, ParsedProfileField[]>;
  enabledCategories: Record<ProfileCategory, boolean>;
  preferences: {
    industries: string[];
    workStyles: string[];
    remotePreference: string;
    trainingTime: string;
    desiredDifficulty: string;
  };
  constraints: {
    excludedRoles: string[];
    excludedIndustries: string[];
  };
  trainingTime: string;
  desiredDifficulty: string;
  exclusions: string[];
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

export type HorizontalBranch = {
  nodeId: string;
  label: string;
  nodeType: string;
  totalScore: number;
  confidence: number;
  transitionSupport: number;
  neighborSupport: number;
  fitReasons: string[];
};

export type HorizontalNavigation = {
  method: string;
  focusNodeId: string;
  left: HorizontalBranch[];
  right: HorizontalBranch[];
};

export type NavigatorData = {
  horizontalNavigation?: HorizontalNavigation;
  statisticalAnalysis?: {
    method: string;
    transitionModel: {
      approvedTransitions: number;
      suppressedTransitions: number;
      privacyThreshold: number;
      method: string;
    };
  };
};
