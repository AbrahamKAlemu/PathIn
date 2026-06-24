import type { Metadata } from "next";

import { Header } from "@/components/linkedin/header";
import { MessagingBar } from "@/components/linkedin/messaging";
import { CareerQuiz } from "@/features/quiz/career-quiz";

export const metadata: Metadata = {
  title: "Career Simulation | PathIn",
  description:
    "Try a career for a few minutes and get concrete next steps based on how you worked through it.",
};

export default function QuizPage() {
  return (
    <main className="min-h-screen bg-[#f3f2ef]">
      <Header active={null} notificationCount={9} />
      <CareerQuiz />
      <MessagingBar />
    </main>
  );
}
