import type { Metadata } from "next";

import { Header } from "@/components/linkedin/header";
import { MessagingBar } from "@/components/linkedin/messaging";
import { ProfilePage } from "@/features/profile/profile-page";

export const metadata: Metadata = {
  title: "Winston Iskandar | LinkedIn",
  description:
    "Winston Iskandar's LinkedIn-style profile and PathIn career evidence controls.",
};

export default function WinstonProfilePage() {
  return (
    <main className="min-h-screen bg-[#f3f2ef]">
      <Header active="profile" notificationCount={9} />
      <ProfilePage />
      <MessagingBar />
    </main>
  );
}
