"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { getCurrentProfile } from "@/features/profile/profile-api";
import type { CurrentProfile } from "@/features/profile/types";

import { CareerMapView } from "./career-map-view";
import styles from "./career-tree.module.css";
import {
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
import type {
  CareerMapData,
  ParsedProfile,
  ParsedProfileField,
  ProfileCategory,
  ProfileSubmission,
} from "./types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
];

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

type ExperiencePhase = "onboarding" | "generating" | "map";

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
  const [phase, setPhase] = useState<ExperiencePhase>("onboarding");
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
  const [savedMapAvailable, setSavedMapAvailable] = useState(false);
  const [openingSavedMap, setOpeningSavedMap] = useState(false);
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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSavedMapAvailable(
        Boolean(
          readSavedMapSnapshot() ||
            window.localStorage.getItem(SAVED_MAP_ID_KEY),
        ),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (phase !== "generating") {
      return;
    }
    const interval = window.setInterval(() => {
      setLoadingStage((current) =>
        Math.min(current + 1, loadingStages.length - 1),
      );
    }, 760);
    return () => window.clearInterval(interval);
  }, [phase]);

  const hasResumeEvidence = Boolean(resume && parsedResume);
  const hasLinkedinEvidence = Boolean(
    parsedLinkedin ||
      (useConnectedProfile && hasEnabledProfileEvidence(connectedProfile)),
  );
  const canGenerate =
    (hasResumeEvidence || hasLinkedinEvidence) &&
    !parsingResume &&
    !parsingLinkedin &&
    phase === "onboarding";

  async function selectResume(file: File | null) {
    if (!file) {
      return;
    }

    setUploadError("");
    setGenerationError("");
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
      setUploadError("Choose a PDF, DOCX, TXT, PNG, or JPEG resume.");
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
      setLinkedinError(
        "Choose a PDF, DOCX, TXT, PNG, or JPEG LinkedIn export.",
      );
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
          : parsedResume?.identity?.name ??
            parsedLinkedin?.identity?.name ??
            "",
      headline,
      fields,
      enabledCategories,
      preferences: {
        industries: fields.industries.map((field) => field.value),
        workStyles: fields.workStyles.map((field) => field.value),
        remotePreference: "",
        trainingTime: "",
        desiredDifficulty: "",
      },
      constraints: {
        excludedRoles: [],
        excludedIndustries: [],
      },
      trainingTime: "",
      desiredDifficulty: "",
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

    try {
      const generated = await generateCareerMap(submission);
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

    try {
      const generated = await regenerateCareerMap(careerMap.id, {
        profile: lastSubmission,
        action,
        targetId,
        pinnedNodeIds,
        dismissedNodeIds,
      });
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

  async function saveMap(map: CareerMapData): Promise<{
    savedAt: string;
    storage: "backend_and_browser" | "browser";
  }> {
    if (!careerMap) {
      throw new PathInApiError("There is no generated map to save.");
    }
    const savedAt = new Date().toISOString();
    let storage: "backend_and_browser" | "browser" = "backend_and_browser";
    let saved: CareerMapData = map;

    try {
      saved = await saveCareerMap(map.id, {
        nodes: map.nodes,
        paths: map.paths,
        pinnedNodeIds: map.pinnedNodeIds ?? [],
        dismissedNodeIds: map.dismissedNodeIds ?? [],
      });
    } catch {
      storage = "browser";
    }

    // The backend mode describes generation; the snapshot also restores the
    // Explore/Build workspace the user was viewing when they saved.
    saved = {
      ...saved,
      mode: map.mode ?? saved.mode,
    };
    writeSavedMapSnapshot(saved, savedAt);
    setSavedMapAvailable(true);
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

    const source: "backend" | "browser" = snapshot ? "browser" : "backend";
    let reopened: CareerMapData | null = snapshot?.map ?? null;
    if (!reopened && mapId) {
      try {
        reopened = await reopenCareerMap(mapId);
      } catch {
        reopened = null;
      }
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
            snapshot.preferences.remotePreference ?? "",
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

  async function openSavedMapFromOnboarding() {
    setGenerationError("");
    setOpeningSavedMap(true);
    try {
      await reopenSavedMap();
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "PathIn could not open the saved path.",
      );
    } finally {
      setOpeningSavedMap(false);
    }
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
    setPhase("onboarding");
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
          {savedMapAvailable ? (
            <section className={styles.savedOnboarding}>
              <div>
                <strong>Saved path available</strong>
                <p>
                  Restore the browser snapshot without generating a new map.
                </p>
              </div>
              <button
                disabled={openingSavedMap}
                onClick={openSavedMapFromOnboarding}
                type="button"
              >
                {openingSavedMap ? "Opening..." : "Open saved path"}
              </button>
            </section>
          ) : null}

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
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,image/png,image/jpeg"
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
                ? "PDF, DOCX, TXT, PNG, or JPEG · maximum 5 MB"
                : "Drag and drop here, or choose a file"}
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              Choose file
            </button>
            <small>
              PDF, DOCX, TXT, PNG, or JPEG · maximum 5 MB. Screenshot OCR runs
              in your browser.
            </small>
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
