"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar } from "./avatar";
import { Icon, LinkedInLogo } from "./icons";

const navigation = [
  { icon: "home" as const, label: "Home", href: "/", id: "home" as const },
  { icon: "network" as const, label: "My Network" },
  {
    icon: "briefcase" as const,
    label: "Jobs",
    id: "jobs" as const,
  },
  { icon: "message" as const, label: "Messaging" },
  { icon: "bell" as const, label: "Notifications", id: "notifications" as const },
];

const panelDescriptions: Record<string, string> = {
  "For Business":
    "Shown only to preserve the host navigation. PathIn has no business-account workflow and sends no organization data.",
  Jobs:
    "Shown only as host context. PathIn does not scrape live jobs or imply access to LinkedIn job listings.",
  Learning:
    "PathIn creates live LinkedIn Learning search links from visible skill gaps; it does not claim enrollment or completion.",
  Messaging:
    "Messaging is outside PathIn. No private conversations are read, generated, or sent.",
  "My Network":
    "Network navigation is outside PathIn. Connection graphs and social suggestions are excluded from recommendation scoring.",
};

type HeaderActive =
  | "home"
  | "jobs"
  | "profile"
  | "notifications"
  | null;

export function Header({
  active = "home",
  notificationCount = 0,
}: {
  active?: HeaderActive;
  notificationCount?: number;
}) {
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  function togglePanel(panel: string) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  return (
    <header className="sticky top-0 z-50 h-[66px] border-b border-[#dedede] bg-white">
      <div className="linkedin-header-inner flex h-full items-center">
        <Link aria-label="PathIn home" href="/">
          <LinkedInLogo className="w-10 h-auto object-contain shrink-0 -translate-y-[3px]" />
        </Link>

        <Link
          aria-label="Open PathIn career explorer"
          className="linkedin-search ml-[10px] flex h-[34px] w-[280px] shrink-0 -translate-y-[3px] items-center rounded-full border border-[#a6a6a6] px-[18px] text-[#555] hover:bg-[#f3f2ef]"
          href="/career-tree"
        >
          <Icon className="size-[16px] shrink-0 text-[#111]" name="search" />
          <span className="ml-[15px] truncate text-[13px] leading-none">
            Explore career paths
          </span>
        </Link>

        <nav aria-label="Primary" className="linkedin-nav ml-auto grid h-full w-[667px]" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr)) 20px repeat(2, minmax(0, 1fr))" }}>
          {navigation.map((item) => {
            const isActive = item.id === active;
            const content = (
              <>
                <div className="relative">
                  <Icon className="size-[23px]" name={item.icon} />
                  {item.id === "notifications" && notificationCount > 0 ? (
                    <span className="absolute -right-[10px] -top-[7px] min-w-[18px] rounded-full bg-[#d3112a] px-[4px] py-px text-center text-[12px] font-bold leading-[16px] text-white">
                      {notificationCount}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`mt-[2px] max-w-[72px] truncate text-center text-[12px] leading-none ${
                    isActive ? "font-semibold text-[#181818]" : "text-[#666]"
                  }`}
                >
                  {item.label}
                </span>
                {isActive ? (
                  <span className="absolute bottom-0 h-[2px] w-full bg-[#191919]" />
                ) : null}
              </>
            );
            const className = `relative flex h-full flex-col items-center justify-center pb-[10px] ${
              isActive ? "text-[#181818]" : "text-[#666]"
            }`;

            return item.href ? (
              <Link
                aria-label={item.label}
                className={className}
                href={item.href}
                key={item.label}
              >
                {content}
              </Link>
            ) : (
              <button
                aria-expanded={openPanel === item.label}
                aria-label={item.label}
                className={`${className} border-0 bg-transparent`}
                key={item.label}
                onClick={() => togglePanel(item.label)}
                type="button"
              >
                {content}
              </button>
            );
          })}

          <Link
            aria-label="Me"
            className={`relative flex h-full flex-col items-center justify-center gap-[2px] pb-[10px] ${
              active === "profile" ? "text-[#181818]" : "text-[#666]"
            }`}
            href="/in/winstoniskandar"
          >
            <Avatar
              alt="Winston Iskandar"
              className="size-[24px]"
              src="/linkedin/profile-small.png"
            />
            <span
              className={`flex items-center gap-[2px] text-[12px] leading-none ${
                active === "profile" ? "font-semibold text-[#181818]" : "text-[#666]"
              }`}
            >
              Me
              <svg className="size-[10px]" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 10.94L2.47 5.41l1.06-1.06L8 8.82l4.47-4.47 1.06 1.06z" />
              </svg>
            </span>
            {active === "profile" ? (
              <span className="absolute bottom-0 h-[2px] w-full bg-[#191919]" />
            ) : null}
          </Link>

          <div aria-hidden="true" className="flex items-center justify-center">
            <div className="h-8 w-px bg-[#dedede]" />
          </div>

          <button
            aria-expanded={openPanel === "For Business"}
            aria-label="For Business"
            className="flex h-full flex-col items-center justify-center gap-[2px] border-0 bg-transparent pb-[10px] text-[#666]"
            onClick={() => togglePanel("For Business")}
            type="button"
          >
            <Icon className="size-[24px]" name="grid" />
            <span className="flex items-center gap-[1px] text-[12px] leading-none">
              For Business
              <svg className="size-[10px]" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 10.94L2.47 5.41l1.06-1.06L8 8.82l4.47-4.47 1.06 1.06z" />
              </svg>
            </span>
          </button>

          <button
            aria-expanded={openPanel === "Learning"}
            aria-label="Learning"
            className="flex h-full flex-col items-center justify-center gap-[2px] border-0 bg-transparent pb-[10px] text-[#666]"
            onClick={() => togglePanel("Learning")}
            type="button"
          >
            <Icon className="h-[23px] w-[28px]" name="media" />
            <span className="text-[12px] leading-none">Learning</span>
          </button>
        </nav>
      </div>

      {openPanel ? (
        <div className="absolute right-4 top-[51px] w-[310px] rounded-[9px] border border-[#d4d4d4] bg-white p-[16px] shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <strong className="block text-[16px]">{openPanel}</strong>
              <p className="mt-[5px] text-[13px] leading-[18px] text-[#666]">
                {openPanel === "Notifications"
                  ? `You have ${notificationCount} notifications.`
                  : panelDescriptions[openPanel]}
              </p>
            </div>
            <button
              aria-label={`Close ${openPanel}`}
              className="size-[28px] shrink-0 rounded-full border-0 bg-transparent p-[5px] text-[#555] hover:bg-[#ececec]"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              <Icon className="size-full" name="close" />
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
