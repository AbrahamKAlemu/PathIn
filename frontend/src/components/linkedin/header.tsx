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
    label: "Jobs and Path[IN]",
    href: "/career-tree",
    id: "jobs" as const,
  },
  { icon: "message" as const, label: "Messaging" },
  { icon: "bell" as const, label: "Notifications", id: "notifications" as const },
];

type HeaderActive = "home" | "jobs" | "profile" | "notifications";

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
    <header className="sticky top-0 z-50 h-[58px] border-b border-[#dedede] bg-white">
      <div className="linkedin-header-inner flex h-full items-center">
        <Link aria-label="LinkedIn home" href="/">
          <LinkedInLogo className="size-[34px] shrink-0 -translate-y-[3px] text-[34px]" />
        </Link>

        <div className="linkedin-search ml-[10px] flex h-[34px] w-[280px] shrink-0 -translate-y-[3px] items-center rounded-full border border-[#a6a6a6] px-[18px] text-[#555]">
          <Icon className="size-[16px] shrink-0 text-[#111]" name="search" />
          <span className="ml-[15px] truncate text-[13px] leading-none">
            I&apos;m looking for...
          </span>
        </div>

        <nav aria-label="Primary" className="linkedin-nav ml-auto grid h-full w-[667px] grid-cols-8">
          {navigation.map((item) => {
            const isActive = item.id === active;
            const content = (
              <>
                <Icon className="size-[23px]" name={item.icon} />
                {item.id === "notifications" ? (
                  <span className="absolute left-[45px] top-[7px] min-w-[33px] rounded-full bg-[#d3112a] px-[5px] py-px text-center text-[14px] font-bold leading-[18px] text-white">
                    {notificationCount}
                  </span>
                ) : null}
                {isActive ? (
                  <span className="absolute bottom-0 h-[2px] w-full bg-[#191919]" />
                ) : null}
              </>
            );
            const className = `relative flex h-full items-center justify-center pb-[6px] ${
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
            className={`relative flex h-full items-center justify-center border-r border-[#dedede] pb-[6px] ${
              active === "profile" ? "text-[#181818]" : "text-[#666]"
            }`}
            href="/in/winstoniskandar"
          >
            <Avatar
              alt="Winston Iskandar"
              className="size-[30px]"
              src="/linkedin/profile-small.png"
            />
            {active === "profile" ? (
              <span className="absolute bottom-0 h-[2px] w-full bg-[#191919]" />
            ) : null}
          </Link>

          <button
            aria-expanded={openPanel === "For Business"}
            aria-label="For Business"
            className="flex h-full items-center justify-center border-0 bg-transparent pb-[6px] text-[#666]"
            onClick={() => togglePanel("For Business")}
            type="button"
          >
            <Icon className="size-[24px]" name="grid" />
          </button>

          <button
            aria-expanded={openPanel === "Learning"}
            aria-label="Learning"
            className="flex h-full items-center justify-center border-0 bg-transparent pb-[6px] text-[#666]"
            onClick={() => togglePanel("Learning")}
            type="button"
          >
            <Icon className="h-[23px] w-[28px]" name="media" />
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
                  : `${openPanel} is available as an interactive prototype scaffold.`}
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
