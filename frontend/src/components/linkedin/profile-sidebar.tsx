import Image from "next/image";

import { Avatar } from "./avatar";
import { LinkedInBadge } from "./icons";

export function ProfileSidebar() {
  return (
    <aside className="profile-column">
      <section className="relative h-[302px] overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white text-[#191919]">
        <div className="h-[70px] border-t-[3px] border-[#f5c879] bg-gradient-to-br from-[#171a1c] to-black">
          <p className="pr-[11px] pt-[10px] text-right text-[18px] font-bold text-white">
            Premium
          </p>
        </div>

        <Avatar
          alt="Winston Iskandar"
          className="absolute left-[23px] top-[40px] size-[95px]"
          src="/linkedin/profile.png"
        />

        <div className="absolute left-[20px] right-[16px] top-[151px]">
          <div className="flex min-w-0 items-center">
            <h1 className="truncate text-[23px] font-bold leading-[26px] tracking-[-0.025em]">
              Winston Isk...
            </h1>
            <LinkedInBadge className="ml-[8px] size-[14px] shrink-0 text-[10px]" />
          </div>

          <p className="mt-[5px] text-[16px] leading-[18px]">
            Similate, Inc. (SR007) |<br />
            CS/Math @ Stanford
          </p>
          <p className="mt-[4px] text-[15px] leading-[18px] text-[#666]">
            United States
          </p>

          <div className="mt-[13px] flex items-center">
            <Image
              alt=""
              aria-hidden="true"
              className="size-[28px] shrink-0"
              height={120}
              src="/linkedin/jane-street.png"
              width={120}
            />
            <span className="ml-[13px] text-[15px] font-bold">Jane Street</span>
          </div>
        </div>
      </section>

      <section className="mt-[8px] h-[164px] overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white text-[#191919]">
        <div className="h-[106px] border-b border-[#dedede] px-[20px] pt-[20px]">
          <div className="flex items-center justify-between text-[15px] font-bold">
            <span>Profile viewers</span>
            <span className="text-[#0a66c2]">649</span>
          </div>
          <p className="mt-[21px] text-[15px] font-bold">View all analytics</p>
        </div>

        <div className="flex h-[58px] items-center px-[21px]">
          <span className="size-[15px] shrink-0 rounded-[3px] bg-gradient-to-br from-[#f1b646] to-[#d47d00]" />
          <span className="ml-[14px] text-[14px] font-bold leading-[17px]">
            Your Premium
            <br />
            features
          </span>
        </div>
      </section>

      <section className="mt-[9px] min-h-[188px] rounded-[10px] border border-[#d4d4d4] bg-white">
        <Image
          alt="Simulate"
          className="ml-[9px] mt-[18px] h-[63px] w-[69px] object-contain"
          height={200}
          src="/linkedin/simulate-mark.png"
          width={220}
        />
      </section>
    </aside>
  );
}
