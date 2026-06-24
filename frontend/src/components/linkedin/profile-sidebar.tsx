import Image from "next/image";
import Link from "next/link";

import { Avatar } from "./avatar";
import { LinkedInBadge } from "./icons";

export function ProfileSidebar() {
  return (
    <aside className="profile-column sticky top-16 h-[calc(100vh-64px)] self-start overflow-y-auto">
      <section className="relative overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white text-[#191919]">
        <div className="h-[70px] bg-gradient-to-br from-[#171a1c] to-black" />

        <Avatar
          alt="Winston Iskandar"
          className="absolute left-[23px] top-[39px] size-[95px]"
          src="/linkedin/profile.png"
        />

        <div className="px-[20px] pb-[18px] pt-[76px]">
          <div className="flex min-w-0 items-center">
            <h2 className="truncate text-[18px] font-bold leading-[22px] tracking-[-0.025em]">
              Winston Iskandar
            </h2>
            <LinkedInBadge className="ml-[8px] size-[14px] shrink-0 text-[10px]" />
          </div>

          <p className="mt-[5px] text-[15px] leading-[19px]">
            Similate, Inc. (SR007) | CS/Math @ Stanford
          </p>
          <p className="mt-[4px] text-[14px] text-[#666]">United States</p>

          <div className="mt-[13px] flex items-center">
            <Image
              alt=""
              aria-hidden="true"
              className="size-[26px] shrink-0"
              height={120}
              src="/linkedin/jane-street.png"
              width={120}
            />
            <span className="ml-[10px] text-[14px]">Jane Street</span>
          </div>

          <Link
            className="mt-[16px] block border-t border-[#e5e5e5] pt-[13px] text-[13px] font-bold text-[#0a66c2]"
            href="/in/winstoniskandar"
          >
            Review authorized profile
          </Link>
        </div>
      </section>

      <section className="mt-[9px] overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white">
        <div className="border-b border-[#e8e8e8] bg-gradient-to-br from-[#e7f3ff] to-white px-[18px] py-[17px]">
          <div className="flex items-center gap-[10px]">
            <span className="grid size-[38px] place-items-center rounded-[8px] bg-[#0a66c2] text-[15px] font-bold text-white">
              in
            </span>
            <div>
              <p className="text-[17px] font-bold leading-[20px]">Path[In]</p>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0a66c2]">
                Career explorer
              </p>
            </div>
          </div>
          <p className="mt-[12px] text-[14px] leading-[19px] text-[#444]">
            Only enabled professional evidence is analyzed. Social activity
            and analytics are excluded.
          </p>
        </div>
        <Link
          className="flex h-[49px] items-center justify-center text-[14px] font-bold text-[#0a66c2] hover:bg-[#f3f2ef]"
          href="/career-tree"
        >
          Explore your paths
        </Link>
      </section>
    </aside>
  );
}
