import type { Metadata } from "next";

import { Header } from "@/components/linkedin/header";
import { ProfilePage } from "@/features/profile/profile-page";

export const metadata: Metadata = {
  title: "Winston Iskandar | PathIn",
  description:
    "Winston Iskandar's LinkedIn-style profile and PathIn career evidence controls.",
};

export default function WinstonProfilePage() {
  return (
    <main className="min-h-screen bg-[#f3f2ef]">
      <Header active="profile" />
      <ProfilePage />
    </main>
  );
}
