"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getCurrentProfile } from "@/features/profile/profile-api";
import type { CurrentProfile } from "@/features/profile/types";
import {
  clearSimulationProfile,
  readSimulationProfile,
  writeSimulationProfile,
} from "@/features/pathin/sim-to-profile";

import {
  fetchRoles,
  fetchScenario,
  generateSuggestions,
} from "./quiz-api";
import type {
  Direction,
  QuizProfile,
  QuizUserProfile,
  Role,
  Scenario,
  ScenarioResponse,
  Suggestion,
} from "./types";

type Stage = "pick" | "play" | "loading" | "results";
type Turn = { prompt: string; answer: string; skipped: boolean };

const EMPTY_PROFILE: QuizUserProfile = {
  stage: "both",
  education: [],
  experience: [],
  skills: [],
  interests: [],
  goals: [],
  existing_activities: [],
};

function buildPrompts(scenario: Scenario): string[] {
  return [
    scenario.opener,
    ...scenario.follow_ups,
    scenario.closer_reflection,
  ];
}

function profileStage(profile: CurrentProfile): QuizUserProfile["stage"] {
  const profileText = [
    profile.headline,
    ...profile.education.flatMap((education) => [
      education.school,
      education.degree,
    ]),
  ]
    .join(" ")
    .toLowerCase();
  if (profileText.includes("high school")) {
    return "high_school";
  }
  if (
    profile.education.length > 0 ||
    /college|university|bachelor|master|stanford/.test(profileText)
  ) {
    return "college";
  }
  return "both";
}

function currentProfileToQuizProfile(
  profile: CurrentProfile,
): QuizUserProfile {
  return {
    name: profile.name,
    headline: profile.headline,
    location: profile.location,
    stage: profileStage(profile),
    education: profile.education.map(
      (education) => `${education.degree} at ${education.school}`,
    ),
    experience: profile.experience.map((experience) =>
      [
        `${experience.title} at ${experience.company}`,
        ...experience.description,
      ].join(": "),
    ),
    skills: profile.skills.map((skill) => skill.name),
    interests: [...profile.careerInterests, ...profile.industries],
    goals: profile.careerGoals,
    existing_activities: [
      ...profile.projects,
      ...profile.experience.map(
        (experience) => `${experience.title} at ${experience.company}`,
      ),
    ],
  };
}

export function CareerQuiz() {
  const [stage, setStage] = useState<Stage>("pick");
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] =
    useState<QuizUserProfile>(EMPTY_PROFILE);
  const [profileConnected, setProfileConnected] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [step, setStep] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [skips, setSkips] = useState(0);
  const [rating, setRating] = useState(7);

  const [direction, setDirection] = useState<Direction | null>(null);
  const [actions, setActions] = useState<Suggestion[]>([]);
  const [quizProfile, setQuizProfile] = useState<QuizProfile | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setQuizProfile(readSimulationProfile());
    });
    fetchRoles()
      .then((data) => setRoles(data.roles))
      .catch((fetchError: unknown) =>
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Career simulations are temporarily unavailable.",
        ),
      )
      .finally(() => setRolesLoading(false));
    getCurrentProfile()
      .then((profile) => {
        setUserProfile(currentProfileToQuizProfile(profile));
        setProfileConnected(true);
      })
      .catch(() => {
        setUserProfile(EMPTY_PROFILE);
        setProfileConnected(false);
      })
      .finally(() => setProfileLoading(false));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const prompts = useMemo(
    () => (scenario ? buildPrompts(scenario) : []),
    [scenario],
  );
  const onRatingStep = scenario !== null && step >= prompts.length;

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, step]);

  async function choose(roleId: string) {
    setError(null);
    try {
      const data = await fetchScenario(roleId);
      setScenario(data.scenario);
      setStep(0);
      setTurns([]);
      setDraft("");
      setSkips(0);
      setRating(7);
      setStage("play");
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "That simulation could not be opened.",
      );
    }
  }

  function next(skipped: boolean) {
    const answer = skipped ? "(skipped)" : draft.trim();
    if (!skipped && !answer) {
      return;
    }
    setTurns((previous) => [
      ...previous,
      { prompt: prompts[step], answer, skipped },
    ]);
    if (skipped) {
      setSkips((count) => count + 1);
    }
    setDraft("");
    setStep((current) => current + 1);
  }

  async function finish() {
    if (!scenario) {
      return;
    }
    setStage("loading");
    setError(null);

    const transcript = turns
      .map((turn) => `Mentor: ${turn.prompt}\nYou: ${turn.answer}`)
      .join("\n\n");
    const reflection = [...turns]
      .reverse()
      .find((turn) => !turn.skipped)?.answer;
    const response: ScenarioResponse = {
      role_id: scenario.role_id,
      role: scenario.role,
      industry: scenario.industry,
      rating,
      skip_count: skips,
      transcript,
      followups: { enjoyed: reflection ?? "" },
    };

    try {
      const result = await generateSuggestions({
        profile: quizProfile,
        user_profile: userProfile,
        new_responses: [response],
      });
      writeSimulationProfile(result.profile);
      setQuizProfile(result.profile);
      setDirection(result.direction);
      setActions(result.actions);
      setStage("results");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "PathIn could not analyze that simulation.",
      );
      setStage("play");
    }
  }

  function restart() {
    setScenario(null);
    setDirection(null);
    setActions([]);
    setStage("pick");
  }

  function clearResults() {
    clearSimulationProfile();
    setQuizProfile(null);
    restart();
  }

  return (
    <section className="mx-auto w-full max-w-[760px] px-4 py-8 text-[#191919]">
      {error ? (
        <p
          className="mb-4 rounded-[8px] border border-[#d6aaa3] bg-[#fff7f6] px-4 py-3 text-[14px] text-[#8f2f24]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {stage === "pick" ? (
        <PickRole
          hasPreviousResults={Boolean(quizProfile)}
          profileConnected={profileConnected}
          profileLoading={profileLoading}
          roles={roles}
          rolesLoading={rolesLoading}
          onChoose={choose}
        />
      ) : null}

      {stage === "play" && scenario ? (
        <PlayScenario
          draft={draft}
          onBack={restart}
          onFinish={finish}
          onNext={next}
          onRatingStep={onRatingStep}
          prompts={prompts}
          rating={rating}
          scenario={scenario}
          setDraft={setDraft}
          setRating={setRating}
          step={step}
          threadEndRef={threadEndRef}
          turns={turns}
        />
      ) : null}

      {stage === "loading" ? <LoadingCard /> : null}

      {stage === "results" && direction ? (
        <Results
          actions={actions}
          direction={direction}
          exploredCount={quizProfile?.roles_explored.length ?? 1}
          onClear={clearResults}
          onRestart={restart}
        />
      ) : null}
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#d4d4d4] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {children}
    </div>
  );
}

function PickRole({
  hasPreviousResults,
  profileConnected,
  profileLoading,
  roles,
  rolesLoading,
  onChoose,
}: {
  hasPreviousResults: boolean;
  profileConnected: boolean;
  profileLoading: boolean;
  roles: Role[];
  rolesLoading: boolean;
  onChoose: (roleId: string) => void;
}) {
  return (
    <div>
      <div className="mb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0a66c2]">
          Career simulation
        </p>
        <h1 className="mt-1 text-[28px] font-semibold leading-[34px] tracking-[-0.025em]">
          Try the work before choosing the path
        </h1>
        <p className="mt-2 max-w-[650px] text-[15px] leading-[22px] text-[#666]">
          Pick a role, work through one short scenario, and rate how the work
          felt. PathIn combines those signals with the professional evidence
          you already authorized.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
          <span
            className={`rounded-full px-3 py-1 font-semibold ${
              profileConnected
                ? "bg-[#e8f5ed] text-[#057642]"
                : "bg-[#f3f2ef] text-[#666]"
            }`}
          >
            {profileLoading
              ? "Checking connected profile"
              : profileConnected
                ? "Connected profile included"
                : "Simulation-only mode"}
          </span>
          {hasPreviousResults ? (
            <span className="text-[#666]">
              Previous simulations will be combined with this one.
            </span>
          ) : null}
        </div>
      </div>

      {rolesLoading ? (
        <Card>
          <p className="text-[14px] text-[#666]">Loading simulations...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-[620px]:grid-cols-1">
          {roles.map((role) => (
            <button
              className="rounded-[10px] border border-[#d4d4d4] bg-white p-4 text-left transition hover:border-[#0a66c2] hover:bg-[#f8fbfe] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a66c2]"
              key={role.role_id}
              onClick={() => onChoose(role.role_id)}
              type="button"
            >
              <p className="text-[15px] font-semibold">{role.role}</p>
              <p className="mt-1 text-[13px] text-[#666]">
                {role.industry} · {role.shape.replace("-", " ")}
              </p>
            </button>
          ))}
        </div>
      )}

      <p className="mt-5 text-[13px] text-[#666]">
        Prefer to start from your existing evidence?{" "}
        <Link
          className="font-semibold text-[#0a66c2] hover:underline"
          href="/career-tree"
        >
          Build your career map
        </Link>
      </p>
    </div>
  );
}

function Bubble({ who, text }: { who: "mentor" | "you"; text: string }) {
  const isMentor = who === "mentor";
  return (
    <div className={isMentor ? "flex justify-start" : "flex justify-end"}>
      <div
        className={
          isMentor
            ? "max-w-[88%] rounded-[12px] bg-[#f3f2ef] px-4 py-3 text-[15px] leading-[22px]"
            : "max-w-[88%] rounded-[12px] bg-[#0a66c2] px-4 py-3 text-[15px] leading-[22px] text-white"
        }
      >
        {text}
      </div>
    </div>
  );
}

function PlayScenario({
  scenario,
  prompts,
  step,
  turns,
  onRatingStep,
  draft,
  setDraft,
  rating,
  setRating,
  onNext,
  onFinish,
  onBack,
  threadEndRef,
}: {
  scenario: Scenario;
  prompts: string[];
  step: number;
  turns: Turn[];
  onRatingStep: boolean;
  draft: string;
  setDraft: (value: string) => void;
  rating: number;
  setRating: (value: number) => void;
  onNext: (skipped: boolean) => void;
  onFinish: () => void;
  onBack: () => void;
  threadEndRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <Card>
      <button
        className="mb-3 text-[13px] font-semibold text-[#666] hover:text-[#191919]"
        onClick={onBack}
        type="button"
      >
        ← Pick another role
      </button>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0a66c2]">
        {scenario.role}
      </p>
      <p className="mt-2 text-[14px] italic leading-[21px] text-[#666]">
        {scenario.setup}
      </p>
      <p className="mt-2 text-[13px] leading-[19px] text-[#666]">
        {scenario.skip_offer}
      </p>

      <div className="my-5 space-y-3">
        {turns.map((turn, index) => (
          <div className="space-y-2" key={`${turn.prompt}-${index}`}>
            <Bubble text={turn.prompt} who="mentor" />
            <Bubble text={turn.answer} who="you" />
          </div>
        ))}
        {!onRatingStep ? (
          <Bubble text={prompts[step]} who="mentor" />
        ) : null}
        <div ref={threadEndRef} />
      </div>

      {onRatingStep ? (
        <div className="border-t border-[#e8e8e8] pt-4">
          <p className="mb-3 text-[16px]">{scenario.closer_rating}</p>
          <div className="mb-4 flex items-center gap-3">
            <input
              aria-label="Enjoyment rating"
              className="flex-1 accent-[#0a66c2]"
              max={10}
              min={1}
              onChange={(event) => setRating(Number(event.target.value))}
              type="range"
              value={rating}
            />
            <span className="w-12 text-center text-[16px] font-semibold text-[#0a66c2]">
              {rating}/10
            </span>
          </div>
          <button
            className="rounded-full bg-[#0a66c2] px-5 py-2 text-[15px] font-semibold text-white hover:bg-[#004182]"
            onClick={onFinish}
            type="button"
          >
            See what this suggests
          </button>
        </div>
      ) : (
        <div className="border-t border-[#e8e8e8] pt-4">
          <label
            className="sr-only"
            htmlFor="career-simulation-response"
          >
            Your response
          </label>
          <textarea
            className="mb-3 w-full rounded-[8px] border border-[#a6a6a6] p-3 text-[15px] leading-[21px] outline-none focus:border-[#0a66c2] focus:ring-1 focus:ring-[#0a66c2]"
            id="career-simulation-response"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Talk through what you would do..."
            rows={4}
            value={draft}
          />
          <div className="flex items-center gap-3">
            <button
              className="rounded-full bg-[#0a66c2] px-5 py-2 text-[15px] font-semibold text-white hover:bg-[#004182] disabled:opacity-40"
              disabled={draft.trim().length === 0}
              onClick={() => onNext(false)}
              type="button"
            >
              Continue
            </button>
            <button
              className="text-[14px] font-semibold text-[#666] hover:text-[#191919]"
              onClick={() => onNext(true)}
              type="button"
            >
              Skip
            </button>
            <span className="ml-auto text-[13px] text-[#666]">
              {step + 1} of {prompts.length}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card>
      <div
        aria-label="Analyzing simulation"
        className="flex min-h-[180px] flex-col items-center justify-center"
        role="status"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3f8] px-5 py-4">
          {[0, 160, 320].map((delay) => (
            <span
              className="size-2.5 animate-bounce rounded-full bg-[#0a66c2]"
              key={delay}
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        <strong className="mt-4 text-[16px]">
          Comparing your response with your profile
        </strong>
        <p className="mt-1 text-[13px] text-[#666]">
          Separating enjoyment, demonstrated reasoning, and existing evidence.
        </p>
      </div>
    </Card>
  );
}

function readinessLabel(readiness: Direction["readiness"]) {
  return {
    explore: "Explore further",
    "build-skills": "Build the foundation",
    "gain-experience": "Test it through experience",
    apply: "Ready for a real opportunity",
  }[readiness];
}

function Results({
  direction,
  actions,
  exploredCount,
  onRestart,
  onClear,
}: {
  direction: Direction;
  actions: Suggestion[];
  exploredCount: number;
  onRestart: () => void;
  onClear: () => void;
}) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0a66c2]">
              Current signal
            </p>
            <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em]">
              {direction.role}
            </h1>
            <p className="mt-1 text-[13px] text-[#666]">
              {direction.industry} · {readinessLabel(direction.readiness)}
            </p>
          </div>
          <span className="rounded-full bg-[#edf3f8] px-3 py-1 text-[13px] font-semibold text-[#0a66c2]">
            {direction.fit_score}/100 signal
          </span>
        </div>
        <p className="mt-4 text-[15px] leading-[22px] text-[#444]">
          {direction.why}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 max-[620px]:grid-cols-1">
          <div className="rounded-[8px] bg-[#f3f8f5] p-3">
            <strong className="text-[12px] uppercase tracking-[0.06em] text-[#057642]">
              Evidence from your response
            </strong>
            <p className="mt-1 text-[14px] leading-[20px]">
              {direction.strengths[0]}
            </p>
          </div>
          <div className="rounded-[8px] bg-[#f8f6f0] p-3">
            <strong className="text-[12px] uppercase tracking-[0.06em] text-[#765b18]">
              Next test
            </strong>
            <p className="mt-1 text-[14px] leading-[20px]">
              {direction.gaps[0]}
            </p>
          </div>
        </div>
      </Card>

      {actions.length > 0 ? (
        <section>
          <div className="mb-2 px-1">
            <h2 className="text-[16px] font-semibold">Example next steps</h2>
            <p className="text-[12px] text-[#666]">
              Prototype matches only. Verify availability before acting.
            </p>
          </div>
          <div className="space-y-3">
            {actions.map((action) => (
              <article
                className="rounded-[10px] border border-[#d4d4d4] bg-white p-4"
                key={action.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold">
                      {action.title}
                    </h3>
                    <p className="mt-1 text-[13px] text-[#666]">
                      {action.location} ·{" "}
                      {action.deadline === "rolling"
                        ? "rolling"
                        : `verify ${action.deadline}`}
                    </p>
                    {action.requirements[0] ? (
                      <p className="mt-2 max-w-[560px] text-[13px] leading-[19px] text-[#444]">
                        {action.requirements[0]}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-[#edf3f8] px-2.5 py-1 text-[11px] font-semibold uppercase text-[#0a66c2]">
                    Example {action.type}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <button
        className="w-full rounded-full bg-[#0a66c2] px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#004182]"
        onClick={() => router.push("/career-tree?from=sim")}
        type="button"
      >
        Use this signal in my career map
      </button>

      <div className="flex flex-wrap items-center gap-4 px-1">
        <button
          className="text-[14px] font-semibold text-[#0a66c2] hover:underline"
          onClick={onRestart}
          type="button"
        >
          Try another career
        </button>
        <button
          className="text-[14px] font-semibold text-[#666] hover:text-[#191919]"
          onClick={onClear}
          type="button"
        >
          Clear simulation results
        </button>
        <span className="ml-auto text-[12px] text-[#666]">
          {exploredCount} {exploredCount === 1 ? "role" : "roles"} explored
        </span>
      </div>
    </div>
  );
}
