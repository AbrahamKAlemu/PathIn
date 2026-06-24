import Link from "next/link";

import { Icon } from "./icons";

const checks = [
  "Resume upload is optional",
  "Every score exposes its components",
  "Sparse transitions hide exact counts",
  "Saved maps retain a browser snapshot",
];

export function NewsSidebar() {
  return (
    <aside className="news-column self-start sticky top-16 overflow-y-auto rounded-[10px] border border-[#d4d4d4] bg-white px-[17px] pb-[18px] pt-[15px] text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-[21px] font-bold leading-[26px] tracking-[-0.02em]">
          PathIn quick check
        </h2>
        <Icon className="size-[17px] text-[#444]" name="info" />
      </div>

      <p className="mt-[8px] text-[13px] leading-[19px] text-[#666]">
        These checks summarize the product guarantees most relevant to the
        career explorer.
      </p>

      <ul className="mt-[15px] grid gap-[11px]">
        {checks.map((check) => (
          <li className="flex gap-[9px] text-[13px] leading-[18px]" key={check}>
            <span className="mt-[5px] size-[7px] shrink-0 rounded-full bg-[#057642]" />
            <span>{check}</span>
          </li>
        ))}
      </ul>

      <div className="mt-[18px] grid gap-[8px] border-t border-[#e5e5e5] pt-[15px]">
        <Link
          className="flex items-center justify-between rounded-[7px] px-[8px] py-[8px] text-[13px] font-bold text-[#0a66c2] hover:bg-[#edf3f8]"
          href="/career-tree"
        >
          Stress-test the map
          <Icon className="size-[15px]" name="chevron-right" />
        </Link>
        <Link
          className="flex items-center justify-between rounded-[7px] px-[8px] py-[8px] text-[13px] font-bold text-[#0a66c2] hover:bg-[#edf3f8]"
          href="/in/winstoniskandar"
        >
          Inspect data controls
          <Icon className="size-[15px]" name="chevron-right" />
        </Link>
      </div>
    </aside>
  );
}
