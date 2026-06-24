"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { CareerMapView } from "@/features/pathin/career-map-view";
import type { CareerMapData } from "@/features/pathin/types";

import { fetchRoles, fetchScenario, generateSuggestions } from "./quiz-api";
import type {
  QuizProfile,
  Role,
  Scenario,
  ScenarioResponse,
} from "./types";

const PROFILE_KEY = "pathin.quiz.profile";

const USER_PROFILE = { stage: "both" as const, existing_activities: [] };

type Stage = "pick" | "play" | "loading" | "results";

type Turn = { prompt: string; answer: string };

function buildPrompts(scenario: Scenario): string[] {
  return [scenario.opener, ...scenario.follow_ups, scenario.closer_reflection];
}

export function CareerQuiz() {
  const [stage, setStage] = useState<Stage>("pick");
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [step, setStep] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [skips, setSkips] = useState(0);
  const [rating, setRating] = useState(7);

  const [careerMap, setCareerMap] = useState<CareerMapData | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchRoles()
      .then((data) => setRoles(data.roles))
      .catch((err) => setError(err.message));
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
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function next(skipped: boolean) {
    setTurns((prev) => [
      ...prev,
      { prompt: prompts[step], answer: skipped ? "(skipped)" : draft.trim() },
    ]);
    if (skipped) setSkips((count) => count + 1);
    setDraft("");
    setStep((current) => current + 1);
  }

  function loadProfile(): QuizProfile | null {
    const stored = window.localStorage.getItem(PROFILE_KEY);
    return stored ? (JSON.parse(stored) as QuizProfile) : null;
  }

  async function finish() {
    if (!scenario) return;
    setStage("loading");
    setError(null);

    const transcript = turns
      .map((turn) => `Mentor: ${turn.prompt}\nYou: ${turn.answer}`)
      .join("\n\n");

    const response: ScenarioResponse = {
      role: scenario.role,
      industry: scenario.industry,
      rating,
      skip_count: skips,
      transcript,
      followups: { enjoyed: turns[turns.length - 1]?.answer ?? "" },
    };

    try {
      const result = await generateSuggestions({
        profile: loadProfile(),
        user_profile: USER_PROFILE,
        new_responses: [response],
      });
      setCareerMap(result);
      setStage("results");
    } catch (err) {
      setError((err as Error).message);
      setStage("play");
    }
  }

  function restart() {
    setScenario(null);
    setCareerMap(null);
    setStage("pick");
  }

  return (
    <section className="mx-auto max-w-[680px] px-4 py-6">
      {error ? (
        <p className="mb-4 rounded-[8px] border border-[#d4d4d4] bg-white px-4 py-3 text-[14px] text-[#b84725]">
          {error}
        </p>
      ) : null}

      {stage === "pick" ? <PickRole roles={roles} onChoose={choose} /> : null}

      {stage === "play" && scenario ? (
        <PlayScenario
          scenario={scenario}
          prompts={prompts}
          step={step}
          turns={turns}
          onRatingStep={onRatingStep}
          draft={draft}
          setDraft={setDraft}
          rating={rating}
          setRating={setRating}
          onNext={next}
          onFinish={finish}
          onBack={restart}
          threadEndRef={threadEndRef}
        />
      ) : null}

      {stage === "loading" ? (
        <Card>
          <p className="text-[15px] text-[#666]">
            Reading how you worked through that…
          </p>
        </Card>
      ) : null}

      {stage === "results" && careerMap ? (
        <ResultsMap careerMap={careerMap} onRestart={restart} />
      ) : null}
    </section>
  );
}

function ResultsMap({
  careerMap,
  onRestart,
}: {
  careerMap: CareerMapData;
  onRestart: () => void;
}) {
  const noop = async () => {};
  return (
    <div>
      <CareerMapView
        key={careerMap.id}
        initialMap={careerMap}
        onBuildToward={noop}
        onRegenerate={noop}
        onReopenSaved={noop}
        onSave={noop}
        onStartOver={onRestart}
        onSubmitFeedback={noop}
      />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#d4d4d4] bg-white p-5">
      {children}
    </div>
  );
}

function PickRole({
  roles,
  onChoose,
}: {
  roles: Role[];
  onChoose: (roleId: string) => void;
}) {
  return (
    <div>
      <h1 className="mb-1 text-[22px] font-semibold text-[#191919]">
        Try a career for a few minutes
      </h1>
      <p className="mb-5 text-[14px] text-[#666]">
        Pick something you&apos;re curious about. No experience needed — just
        see how it feels.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {roles.map((role) => (
          <button
            key={role.role_id}
            onClick={() => onChoose(role.role_id)}
            className="rounded-[10px] border border-[#d4d4d4] bg-white p-4 text-left transition hover:border-[#0a66c2] hover:shadow-sm"
          >
            <p className="text-[15px] font-semibold text-[#191919]">
              {role.role}
            </p>
            <p className="mt-1 text-[13px] text-[#666]">{role.industry}</p>
          </button>
        ))}
      </div>
      <p className="mt-5 text-[13px] text-[#666]">
        Already have experience?{" "}
        <Link
          href="/career-tree"
          className="font-semibold text-[#0a66c2] hover:underline"
        >
          Get recommendations from your resume instead
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
            ? "max-w-[85%] rounded-[12px] bg-[#f3f2ef] px-4 py-2.5 text-[15px] leading-relaxed text-[#191919]"
            : "max-w-[85%] rounded-[12px] bg-[#0a66c2] px-4 py-2.5 text-[15px] leading-relaxed text-white"
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
  threadEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Card>
      <button
        onClick={onBack}
        className="mb-3 text-[13px] font-semibold text-[#666] hover:text-[#191919]"
      >
        ← Not for me, pick another
      </button>
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#0a66c2]">
        {scenario.role}
      </p>

      <div className="mb-4 space-y-3">
        <p className="text-[14px] italic text-[#666]">{scenario.setup}</p>

        {turns.map((turn, index) => (
          <div key={index} className="space-y-2">
            <Bubble who="mentor" text={turn.prompt} />
            <Bubble who="you" text={turn.answer} />
          </div>
        ))}

        {!onRatingStep ? <Bubble who="mentor" text={prompts[step]} /> : null}

        <div ref={threadEndRef} />
      </div>

      {onRatingStep ? (
        <div className="border-t border-[#e8e8e8] pt-4">
          <p className="mb-3 text-[16px] text-[#191919]">
            {scenario.closer_rating}
          </p>
          <div className="mb-4 flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="flex-1 accent-[#0a66c2]"
            />
            <span className="w-8 text-center text-[16px] font-semibold text-[#0a66c2]">
              {rating}
            </span>
          </div>
          <button
            onClick={onFinish}
            className="rounded-full bg-[#0a66c2] px-5 py-2 text-[15px] font-semibold text-white hover:bg-[#004182]"
          >
            See my suggestions
          </button>
        </div>
      ) : (
        <div className="border-t border-[#e8e8e8] pt-4">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder="Type how you'd think it through…"
            className="mb-3 w-full rounded-[8px] border border-[#d4d4d4] p-3 text-[15px] text-[#191919] outline-none focus:border-[#0a66c2]"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNext(false)}
              disabled={draft.trim().length === 0}
              className="rounded-full bg-[#0a66c2] px-5 py-2 text-[15px] font-semibold text-white hover:bg-[#004182] disabled:opacity-40"
            >
              Send
            </button>
            <button
              onClick={() => onNext(true)}
              className="text-[14px] font-semibold text-[#666] hover:text-[#191919]"
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
