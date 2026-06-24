import type { Metadata } from "next";

import { Header } from "@/components/linkedin/header";
import { MessagingBar } from "@/components/linkedin/messaging";
import { CareerTree } from "@/features/pathin/career-tree";

export const metadata: Metadata = {
  title: "Path[IN] | LinkedIn",
  description:
    "Explore possible career paths, compare route evidence, and build practical next steps from your profile.",
};

export default function CareerTreePage() {
  return (
    <main className="min-h-screen bg-[#f3f2ef]">
      <Header active={null} />
      <CareerTree />
      <MessagingBar />
    </main>
  );
}
