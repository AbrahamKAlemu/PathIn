import type { Metadata } from "next";

import { Header } from "@/components/linkedin/header";
import { MessagingBar } from "@/components/linkedin/messaging";
import { CareerTree } from "@/features/pathin/career-tree";
import { getPitCareerMap } from "@/features/pathin/pit-data.server";

export const metadata: Metadata = {
  title: "Path[IN] | LinkedIn",
  description:
    "Explore possible career paths, compare route evidence, and build practical next steps from your profile.",
};

export default async function CareerTreePage() {
  const careerMap = await getPitCareerMap();

  return (
    <main className="min-h-screen bg-[#f3f2ef]">
      <Header active="jobs" />
      <CareerTree initialMap={careerMap} />
      <MessagingBar />
    </main>
  );
}
