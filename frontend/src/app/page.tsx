import { Feed } from "@/components/linkedin/feed";
import { Header } from "@/components/linkedin/header";
import { MessagingBar } from "@/components/linkedin/messaging";
import { NewsSidebar } from "@/components/linkedin/news-sidebar";
import { ProfileSidebar } from "@/components/linkedin/profile-sidebar";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f2ef]">
      <Header />
      <div className="linkedin-grid pt-[30px]">
        <ProfileSidebar />
        <Feed />
        <NewsSidebar />
      </div>
      <MessagingBar />
    </main>
  );
}
