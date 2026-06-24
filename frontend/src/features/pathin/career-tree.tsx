"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { LinkedInLogo } from "@/components/linkedin/icons";
import { getCurrentProfile } from "@/features/profile/profile-api";
import type { CurrentProfile } from "@/features/profile/types";

import { CareerMapView } from "./career-map-view";
import styles from "./career-tree.module.css";
import {
  buildCareerMap,
  generateCareerMap,
  parseProfileFile,
  PathInApiError,
  regenerateCareerMap,
  reopenCareerMap,
  saveCareerMap,
  submitCareerFeedback,
  type RegenerationAction,
} from "./pathin-api";
import {
  readSavedMapSnapshot,
  SAVED_MAP_ID_KEY,
  writeSavedMapSnapshot,
} from "./saved-map-storage";
import { simProfileToFields } from "./sim-to-profile";
import type {
  CareerMapData,
  ParsedProfile,
  ParsedProfileField,
  ProfileCategory,
  ProfileSubmission,
} from "./types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_FILE_EXTENSIONS = [".pdf", ".docx", ".txt"];

const profileCategories: ProfileCategory[] = [
  "education",
  "coursework",
  "roles",
  "responsibilities",
  "dates",
  "projects",
  "skills",
  "certifications",
  "industries",
  "achievements",
  "interests",
  "locations",
  "goals",
  "workStyles",
];

const loadingStages = [
  "Reading your experience",
  "Identifying your strongest skills",
  "Matching potential careers",
  "Building your career path",
];

type ExperiencePhase = "choice" | "onboarding" | "generating" | "map";

function categoryRecord<T>(
  createValue: (category: ProfileCategory) => T,
): Record<ProfileCategory, T> {
  return profileCategories.reduce(
    (record, category) => {
      record[category] = createValue(category);
      return record;
    },
    {} as Record<ProfileCategory, T>,
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cloneProfileFields(
  fieldSets: Array<Partial<Record<ProfileCategory, ParsedProfileField[]>>>,
): Record<ProfileCategory, ParsedProfileField[]> {
  return categoryRecord((category) =>
    fieldSets.flatMap((fields) =>
      (fields[category] ?? []).map((field) => ({
        ...field,
        originalSource: field.originalSource ?? field.source,
        importBatch:
          field.importBatch ??
          `${field.originalSource ?? field.source}-upload`,
        enabled: true,
      })),
    ),
  );
}

function hasEnabledProfileEvidence(profile: CurrentProfile | null) {
  if (!profile?.pathinEvidence) {
    return false;
  }

  return profileCategories.some(
    (category) =>
      profile.pathinEvidence.enabledCategories[category] &&
      (profile.pathinEvidence.fields[category]?.length ?? 0) > 0,
  );
}

export function CareerTree() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoGenRef = useRef(false);
  const [phase, setPhase] = useState<ExperiencePhase>("choice");
  const [careerMap, setCareerMap] = useState<CareerMapData | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedProfile | null>(null);
  const [parsingResume, setParsingResume] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [parsedLinkedin, setParsedLinkedin] =
    useState<ParsedProfile | null>(null);
  const [parsingLinkedin, setParsingLinkedin] = useState(false);
  const [linkedinError, setLinkedinError] = useState("");
  const [connectedProfile, setConnectedProfile] =
    useState<CurrentProfile | null>(null);
  const [connectedProfileLoading, setConnectedProfileLoading] = useState(true);
  const [connectedProfileError, setConnectedProfileError] = useState("");
  const [useConnectedProfile, setUseConnectedProfile] = useState(true);
  const [generationError, setGenerationError] = useState("");
  const [loadingStage, setLoadingStage] = useState(0);
  const [lastSubmission, setLastSubmission] =
    useState<ProfileSubmission | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const linkedinInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getCurrentProfile()
      .then((profile) => {
        if (active) {
          setConnectedProfile(profile);
          setConnectedProfileError("");
        }
      })
      .catch((error) => {
        if (active) {
          setConnectedProfileError(
            error instanceof Error
              ? error.message
              : "The connected profile is temporarily unavailable.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setConnectedProfileLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const hasResumeEvidence = Boolean(resume && parsedResume);
  const hasLinkedinEvidence = Boolean(
    parsedLinkedin ||
      (useConnectedProfile && hasEnabledProfileEvidence(connectedProfile)),
  );
  const canGenerate =
    (hasResumeEvidence || hasLinkedinEvidence) &&
    !parsingResume &&
    !parsingLinkedin &&
    (phase === "onboarding" || phase === "choice");

  async function selectResume(file: File | null) {
    if (!file) {
      return;
    }

    setUploadError("");
    setGenerationError("");
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
      setUploadError("Choose a PDF, DOCX, or TXT resume.");
      if (fileInput.current) {
        fileInput.current.value = "";
      }
      return;
    }
    if (file.size === 0) {
      setUploadError("The selected resume is empty.");
      if (fileInput.current) {
        fileInput.current.value = "";
      }
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError("The selected resume exceeds the 5 MB limit.");
      if (fileInput.current) {
        fileInput.current.value = "";
      }
      return;
    }

    const previousResume = resume;
    const previousParsedResume = parsedResume;
    setResume(file);
    setParsedResume(null);
    setParsingResume(true);

    try {
      const parsed = await parseProfileFile(file, "resume");
      if (parsed.summary.fieldCount === 0) {
        throw new Error("We could not find usable experience in this resume.");
      }
      setParsedResume(parsed);
    } catch (error) {
      setResume(previousResume);
      setParsedResume(previousParsedResume);
      setUploadError(
        error instanceof Error
          ? error.message
          : "PathIn could not read this resume.",
      );
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    } finally {
      setParsingResume(false);
    }
  }

  function removeResume() {
    setResume(null);
    setParsedResume(null);
    setUploadError("");
    setGenerationError("");
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  async function selectLinkedin(file: File | null) {
    if (!file) {
      return;
    }

    setLinkedinError("");
    setGenerationError("");
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
      setLinkedinError("Choose a PDF, DOCX, or TXT LinkedIn export.");
      if (linkedinInput.current) {
        linkedinInput.current.value = "";
      }
      return;
    }
    if (file.size === 0) {
      setLinkedinError("The selected LinkedIn export is empty.");
      if (linkedinInput.current) {
        linkedinInput.current.value = "";
      }
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setLinkedinError("The selected LinkedIn export exceeds 5 MB.");
      if (linkedinInput.current) {
        linkedinInput.current.value = "";
      }
      return;
    }

    const previousFile = linkedinFile;
    const previousParsed = parsedLinkedin;
    setLinkedinFile(file);
    setParsedLinkedin(null);
    setParsingLinkedin(true);

    try {
      const parsed = await parseProfileFile(file, "linkedin");
      if (parsed.summary.fieldCount === 0) {
        throw new Error(
          "We could not find usable experience in this LinkedIn export.",
        );
      }
      setParsedLinkedin(parsed);
    } catch (error) {
      setLinkedinFile(previousFile);
      setParsedLinkedin(previousParsed);
      setLinkedinError(
        error instanceof Error
          ? error.message
          : "PathIn could not read this LinkedIn export.",
      );
      if (linkedinInput.current) {
        linkedinInput.current.value = "";
      }
    } finally {
      setParsingLinkedin(false);
    }
  }

  function removeLinkedin() {
    setLinkedinFile(null);
    setParsedLinkedin(null);
    setLinkedinError("");
    setGenerationError("");
    if (linkedinInput.current) {
      linkedinInput.current.value = "";
    }
  }

  function buildSubmission(): ProfileSubmission {
    const connectedFields =
      connectedProfile?.pathinEvidence && useConnectedProfile
        ? categoryRecord((category) =>
            connectedProfile.pathinEvidence.enabledCategories[category]
              ? connectedProfile.pathinEvidence.fields[category] ?? []
              : [],
          )
        : null;
    const fields = cloneProfileFields(
      [
        simProfileToFields(),
        parsedResume?.fields,
        connectedFields,
        parsedLinkedin?.fields,
      ].filter(
        (
          fieldSet,
        ): fieldSet is Partial<
          Record<ProfileCategory, ParsedProfileField[]>
        > => Boolean(fieldSet),
      ),
    );
    const enabledCategories = categoryRecord(() => true);
    const headline =
      fields.roles[0]?.value ??
      fields.projects[0]?.value ??
      fields.interests[0]?.value ??
      "";

    return {
      name:
        connectedProfile && useConnectedProfile
          ? connectedProfile.name
          : "",
      headline,
      fields,
      enabledCategories,
      preferences: {
        industries: fields.industries.map((field) => field.value),
        workStyles: fields.workStyles.map((field) => field.value),
        remotePreference: "Flexible",
        trainingTime: "A few hours per week",
        desiredDifficulty: "Flexible",
      },
      constraints: {
        excludedRoles: [],
        excludedIndustries: [],
      },
      trainingTime: "A few hours per week",
      desiredDifficulty: "Flexible",
      exclusions: [],
    };
  }

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!canGenerate) {
      return;
    }

    const submission = buildSubmission();
    setLastSubmission(submission);
    setGenerationError("");
    setLoadingStage(0);
    setPhase("generating");
    const startedAt = Date.now();

    try {
      const generated = await generateCareerMap(submission);
      const remaining = Math.max(0, 3200 - (Date.now() - startedAt));
      if (remaining) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }
      setCareerMap(generated);
      setPhase("map");
    } catch (error) {
      setGenerationError(
        error instanceof PathInApiError || error instanceof Error
          ? error.message
          : "PathIn could not generate a career path.",
      );
      setPhase("onboarding");
    }
  }

  useEffect(() => {
    if (autoGenRef.current) return;
    if (searchParams.get("from") !== "sim") return;
    if (connectedProfileLoading) return;
    autoGenRef.current = true;
    // Defer out of the effect body so we don't setState synchronously.
    const timer = window.setTimeout(() => {
      void generate();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedProfileLoading, searchParams]);

  async function regenerate(
    action: RegenerationAction,
    {
      targetId,
      pinnedNodeIds = [],
      dismissedNodeIds = [],
    }: {
      targetId?: string;
      pinnedNodeIds?: string[];
      dismissedNodeIds?: string[];
    } = {},
  ) {
    if (!careerMap || !lastSubmission) {
      return;
    }

    setGenerationError("");
    setLoadingStage(0);
    setPhase("generating");
    const startedAt = Date.now();

    try {
      const generated = await regenerateCareerMap(careerMap.id, {
        profile: lastSubmission,
        action,
        targetId,
        pinnedNodeIds,
        dismissedNodeIds,
      });
      const remaining = Math.max(0, 2600 - (Date.now() - startedAt));
      if (remaining) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }
      setCareerMap(generated);
      setPhase("map");
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "PathIn could not regenerate this map.",
      );
      setPhase("map");
    }
  }

  async function buildToward(destinationId: string) {
    if (!lastSubmission) {
      return;
    }

    setGenerationError("");
    setLoadingStage(0);
    setPhase("generating");
    const startedAt = Date.now();

    try {
      const generated = await buildCareerMap(lastSubmission, destinationId);
      const remaining = Math.max(0, 2600 - (Date.now() - startedAt));
      if (remaining) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }
      setCareerMap(generated);
      setPhase("map");
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "PathIn could not build this destination.",
      );
      setPhase("map");
    }
  }

  async function saveMap(
    pinnedNodeIds: string[],
    dismissedNodeIds: string[],
  ): Promise<{
    savedAt: string;
    storage: "backend_and_browser" | "browser";
  }> {
    if (!careerMap) {
      throw new PathInApiError("There is no generated map to save.");
    }
    const savedAt = new Date().toISOString();
    let storage: "backend_and_browser" | "browser" = "backend_and_browser";
    let saved: CareerMapData = {
      ...careerMap,
      pinnedNodeIds,
      dismissedNodeIds,
    };

    try {
      saved = await saveCareerMap(careerMap.id, {
        pinnedNodeIds,
        dismissedNodeIds,
      });
    } catch {
      storage = "browser";
    }

    writeSavedMapSnapshot(saved, savedAt);
    setCareerMap(saved);
    return { savedAt, storage };
  }

  async function reopenSavedMap(): Promise<{
    source: "backend" | "browser";
  }> {
    const snapshot = readSavedMapSnapshot();
    const mapId =
      window.localStorage.getItem(SAVED_MAP_ID_KEY) ?? snapshot?.map.id;
    if (!mapId && !snapshot) {
      throw new PathInApiError("No saved generated map was found.");
    }

    let source: "backend" | "browser" = "backend";
    let reopened: CareerMapData | null = null;
    if (mapId) {
      try {
        reopened = await reopenCareerMap(mapId);
      } catch {
        reopened = snapshot?.map ?? null;
        source = "browser";
      }
    } else {
      reopened = snapshot?.map ?? null;
      source = "browser";
    }
    if (!reopened) {
      throw new PathInApiError(
        "The saved map is no longer available. Save the current map again.",
      );
    }

    setCareerMap(reopened);

    if (reopened.profileSnapshot) {
      const snapshot = reopened.profileSnapshot;
      setLastSubmission({
        name: snapshot.name,
        headline: snapshot.headline,
        fields: snapshot.fieldEvidence,
        enabledCategories: snapshot.enabledCategories,
        preferences: {
          industries: snapshot.industries,
          workStyles: snapshot.workStyles,
          remotePreference: String(
            snapshot.preferences.remotePreference ?? "Flexible",
          ),
          trainingTime: snapshot.trainingTime,
          desiredDifficulty: snapshot.desiredDifficulty,
        },
        constraints: {
          excludedRoles: snapshot.exclusions,
          excludedIndustries: [],
        },
        trainingTime: snapshot.trainingTime,
        desiredDifficulty: snapshot.desiredDifficulty,
        exclusions: snapshot.exclusions,
      });
    }

    setPhase("map");
    return { source };
  }

  async function submitFeedback(
    target: { id: string; label: string; type: "node" | "edge" },
    category: string,
  ) {
    if (!careerMap) {
      return;
    }
    await submitCareerFeedback(careerMap.id, {
      target,
      category,
    });
  }

  function startOver() {
    setCareerMap(null);
    setLastSubmission(null);
    setResume(null);
    setParsedResume(null);
    setParsingResume(false);
    setUploadError("");
    setLinkedinFile(null);
    setParsedLinkedin(null);
    setParsingLinkedin(false);
    setLinkedinError("");
    setGenerationError("");
    setLoadingStage(0);
    if (fileInput.current) {
      fileInput.current.value = "";
    }
    if (linkedinInput.current) {
      linkedinInput.current.value = "";
    }
    setPhase("choice");
  }

  if (phase === "choice") {
    return (
      <section className={styles.onboardingPage}>
        <div className={styles.onboardingHero}>
          <span className={styles.heroLogo}>
            <LinkedInLogo className="size-[34px]" />
          </span>
          <span className={styles.heroEyebrow}>
            Explainable career exploration
          </span>
          <h1>Try careers before you commit to one.</h1>
          <p>
            Simulate a real day in a role to see how it actually fits — or build
            straight from the profile you already control. Every recommendation
            is one you can open and inspect.
          </p>
          <div className={styles.heroActions}>
            <button
              type="button"
              onClick={() => router.push("/quiz")}
              className={styles.heroPrimary}
            >
              Simulate careers
            </button>
            <button
              type="button"
              onClick={() => setPhase("onboarding")}
              className={styles.heroSecondary}
            >
              Use my profile
            </button>
          </div>
        </div>

        <div className={styles.featureRow}>
          <div className={styles.featureCol}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h3>Try the work itself</h3>
            <p>
              Play a short, scripted scenario for a role and rate how it felt.
              No experience needed.
            </p>
          </div>
          <div className={styles.featureCol}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <h3>Build from your profile</h3>
            <p>
              Generate routes from the profile you control. Add a resume for
              stronger, more personal matches.
            </p>
          </div>
          <div className={styles.featureCol}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <h3>Inspect every step</h3>
            <p>
              Open any recommendation to see its score, the signals behind it,
              and where the evidence came from.
            </p>
          </div>
        </div>

        <div className={styles.boundariesCard}>
          <h2 className={styles.boundariesTitle}>Recommendation boundaries</h2>
          <p>Only enabled profile categories and any resume you upload are scored.</p>
          <p>Social activity, analytics, demographics, and private messages are excluded.</p>
          <p>Results are explainable possibilities, not hiring predictions or guarantees.</p>
        </div>
      </section>
    );
  }

  if (phase === "generating") {
    return (
      <GenerationScreen
        currentStage={loadingStage}
        hasLinkedin={hasLinkedinEvidence}
        hasResume={hasResumeEvidence}
        stages={loadingStages}
      />
    );
  }

  if (phase === "map" && careerMap) {
    return (
      <CareerMapView
        generationError={generationError}
        initialMap={careerMap}
        key={`${careerMap.id}-${careerMap.generation.generatedAt ?? ""}`}
        onBuildToward={buildToward}
        onRegenerate={regenerate}
        onReopenSaved={reopenSavedMap}
        onSave={saveMap}
        onStartOver={startOver}
        onSubmitFeedback={submitFeedback}
      />
    );
  }

  return (
    <form className={styles.uploadPage} onSubmit={generate}>
      <div className={styles.uploadShell}>
        <header className={styles.uploadIntro}>
          <h1>Build your career path</h1>
          <p>
            Generate from your connected profile. Add a resume for stronger,
            more personalized recommendations.
          </p>
        </header>

        <section className={styles.uploadCard}>
          <ConnectedProfileCard
            enabled={useConnectedProfile}
            error={connectedProfileError}
            loading={connectedProfileLoading}
            onToggle={() => setUseConnectedProfile((current) => !current)}
            profile={connectedProfile}
          />

          <ResumeUpload
            error={uploadError}
            file={resume}
            inputRef={fileInput}
            loading={parsingResume}
            onDrop={selectResume}
            onRemove={removeResume}
            onSelect={(event) =>
              selectResume(event.target.files?.[0] ?? null)
            }
          />

          <div className={styles.linkedinUploadSection}>
            <div className={styles.linkedinUploadHeading}>
              <div>
                <strong>Add another LinkedIn profile export</strong>
                <span>Optional</span>
              </div>
              <p>
                Supplement details missing from the connected profile. LinkedIn
                URLs are not scraped.
              </p>
            </div>
            <EvidenceUpload
              compact
              emptyLabel="LinkedIn PDF or data export"
              error={linkedinError}
              file={linkedinFile}
              inputLabel="Upload LinkedIn profile export"
              inputRef={linkedinInput}
              loading={parsingLinkedin}
              onDrop={selectLinkedin}
              onRemove={removeLinkedin}
              onSelect={(event) =>
                selectLinkedin(event.target.files?.[0] ?? null)
              }
              readyLabel="LinkedIn evidence ready"
            />
          </div>

          {generationError ? (
            <p className={styles.resumeError} role="alert">
              {generationError}
            </p>
          ) : null}

          <button
            className={styles.resumeGenerateButton}
            disabled={!canGenerate}
            type="submit"
          >
            Generate career path
          </button>
        </section>
      </div>

      <p aria-live="polite" className={styles.srStatus}>
        {parsingResume
          ? "Reading the selected resume."
          : parsingLinkedin
            ? "Reading the selected LinkedIn profile export."
            : hasResumeEvidence
              ? hasLinkedinEvidence
                ? "Resume and authorized profile evidence ready. Generate your career path."
                : "Resume ready. Generate your career path."
              : hasLinkedinEvidence
                ? "Authorized profile evidence ready. Generate your career path."
                : connectedProfileLoading
                  ? "Checking your connected profile."
                  : uploadError ||
                    linkedinError ||
                    "Use your connected profile or add a resume to begin."}
      </p>
    </form>
  );
}

function ConnectedProfileCard({
  enabled,
  error,
  loading,
  onToggle,
  profile,
}: {
  enabled: boolean;
  error: string;
  loading: boolean;
  onToggle: () => void;
  profile: CurrentProfile | null;
}) {
  const enabledEvidenceCount = profile?.pathinEvidence
    ? Object.entries(profile.pathinEvidence.fields).reduce(
        (count, [category, fields]) =>
          profile.pathinEvidence.enabledCategories[
            category as ProfileCategory
          ]
            ? count + fields.length
            : count,
        0,
      )
    : 0;

  return (
    <section
      aria-busy={loading}
      className={styles.connectedProfile}
      data-enabled={enabled ? "true" : "false"}
    >
      {loading ? (
        <div className={styles.connectedProfileLoading}>
          <span />
          <div>
            <strong>Loading authorized profile</strong>
            <small>Checking enabled PathIn evidence</small>
          </div>
        </div>
      ) : profile?.pathinEvidence ? (
        <>
          <Image
            alt=""
            className={styles.connectedProfileAvatar}
            height={52}
            src={profile.profilePhoto}
            width={52}
          />
          <div className={styles.connectedProfileIdentity}>
            <div>
              <strong>{profile.name}</strong>
              <span>Connected</span>
            </div>
            <p>{profile.headline}</p>
            <small>
              {enabledEvidenceCount} enabled profile signals · analytics and
              social suggestions excluded
            </small>
          </div>
          <div className={styles.connectedProfileActions}>
            <Link href="/in/winstoniskandar">Review profile</Link>
            <button
              aria-pressed={enabled}
              onClick={onToggle}
              type="button"
            >
              {enabled ? "Using profile" : "Use profile"}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.connectedProfileUnavailable}>
          <strong>Authorized profile unavailable</strong>
          <p>{error || "You can still generate paths from a resume."}</p>
          <Link href="/in/winstoniskandar">Open profile</Link>
        </div>
      )}
    </section>
  );
}

function ResumeUpload({
  error,
  file,
  inputRef,
  loading,
  onDrop,
  onRemove,
  onSelect,
}: {
  error: string;
  file: File | null;
  inputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  onDrop: (file: File) => void;
  onRemove: () => void;
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <EvidenceUpload
      emptyLabel="Add your resume (optional)"
      error={error}
      file={file}
      inputLabel="Upload resume"
      inputRef={inputRef}
      loading={loading}
      onDrop={onDrop}
      onRemove={onRemove}
      onSelect={onSelect}
      readyLabel="Resume ready"
    />
  );
}

function EvidenceUpload({
  compact = false,
  emptyLabel,
  error,
  file,
  inputLabel,
  inputRef,
  loading,
  onDrop,
  onRemove,
  onSelect,
  readyLabel,
}: {
  compact?: boolean;
  emptyLabel: string;
  error: string;
  file: File | null;
  inputLabel: string;
  inputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  onDrop: (file: File) => void;
  onRemove: () => void;
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  readyLabel: string;
}) {
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const dropped = event.dataTransfer.files[0];
    if (dropped) {
      onDrop(dropped);
    }
  }

  return (
    <div>
      <div
        aria-busy={loading}
        className={styles.resumeDrop}
        data-compact={compact ? "true" : "false"}
        data-error={error ? "true" : "false"}
        data-has-file={file ? "true" : "false"}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          accept=".pdf,.docx,.txt"
          aria-label={inputLabel}
          onChange={onSelect}
          ref={inputRef}
          type="file"
        />

        {file ? (
          <div className={styles.resumeFile}>
            <span aria-hidden="true">
              {file.name.split(".").pop()?.toUpperCase()}
            </span>
            <div className={styles.resumeFileName}>
              <strong>{file.name}</strong>
              <small>
                {formatFileSize(file.size)}
                {loading ? " · Reading..." : ` · ${readyLabel}`}
              </small>
            </div>
            <div className={styles.resumeFileActions}>
              <button
                disabled={loading}
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                Replace
              </button>
              <button
                aria-label={`Remove ${file.name}`}
                className={styles.resumeRemoveButton}
                disabled={loading}
                onClick={onRemove}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <>
            <svg
              aria-hidden="true"
              className={styles.resumeUploadIcon}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
              <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
            </svg>
            <strong>{emptyLabel}</strong>
            <p>
              {compact
                ? "PDF, DOCX, or TXT · maximum 5 MB"
                : "Drag and drop here, or choose a file"}
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              Choose file
            </button>
            <small>PDF, DOCX, or TXT · maximum 5 MB</small>
          </>
        )}
      </div>

      {error ? (
        <p className={styles.resumeError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GenerationScreen({
  currentStage,
  hasLinkedin,
  hasResume,
  stages,
}: {
  currentStage: number;
  hasLinkedin: boolean;
  hasResume: boolean;
  stages: string[];
}) {
  const evidenceLabel = hasResume
    ? hasLinkedin
      ? "your resume and LinkedIn evidence"
      : "your resume"
    : "your LinkedIn profile";

  return (
    <section
      aria-labelledby="pathin-generation-title"
      className={styles.careerLoadingScreen}
    >
      <div className={styles.careerLoadingCard}>
        <div className={styles.careerLoadingOrb} aria-hidden="true">
          <span />
          <span />
          <strong>in</strong>
        </div>
        <h1 id="pathin-generation-title">{stages[currentStage]}</h1>
        <p role="status">Creating recommendations from {evidenceLabel}</p>
        <div className={styles.careerLoadingDots} aria-hidden="true">
          {stages.map((stage, index) => (
            <span
              data-state={
                index < currentStage
                  ? "visited"
                  : index === currentStage
                    ? "current"
                    : "waiting"
              }
              key={stage}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
