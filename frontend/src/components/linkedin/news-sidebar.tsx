import { Icon } from "./icons";

const newsItems = [
  {
    lines: ["Oracle cut 21K jobs over the", "past year amid AI revamp"],
    meta: "3h ago  \u00b7  22,533 readers",
  },
  {
    lines: ["Meta unveils new smart glasses,", "including Kylie collab"],
    meta: "3h ago  \u00b7  7,612 readers",
  },
  {
    lines: ["Tech selloff pressures Nasdaq,", "S&P 500 as AI rally stalls"],
    meta: "36m ago  \u00b7  5,701 readers",
  },
  {
    lines: ["Walmart to buy Vibe.co in", "further bet on connected TV"],
    meta: "3h ago  \u00b7  3,262 readers",
  },
];

function WendIcon() {
  return (
    <div className="grid size-[40px] shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-[4px] border-2 border-[#222] bg-[#efb813] text-center text-[13px] font-bold leading-[18px]">
      <span>W</span>
      <span className="bg-[#fff5ce]">E</span>
      <span className="bg-[#fff5ce]">D</span>
      <span>N</span>
    </div>
  );
}

function PatchesIcon() {
  return (
    <div className="relative size-[40px] shrink-0 overflow-hidden rounded-[4px] border-2 border-[#222] bg-[#f7d451]">
      <span className="absolute left-px top-px flex h-[18px] w-[14px] -rotate-3 items-center justify-center rounded-[3px] bg-[#3499e5] text-[9px] font-bold text-white">
        3
      </span>
      <span className="absolute right-px top-px flex h-[21px] w-[17px] rotate-12 items-center justify-center rounded-[3px] bg-[#f04a45] text-[9px] font-bold text-white">
        4
      </span>
      <span className="absolute bottom-px left-[12px] h-[13px] w-[16px] rounded-[2px] border border-[#d49700] bg-[#f9c916]" />
    </div>
  );
}

function PuzzleRow({
  icon,
  name,
}: {
  icon: React.ReactNode;
  name: string;
}) {
  return (
    <div className="mt-[17px] flex items-center">
      {icon}
      <div className="ml-[11px] min-w-0">
        <p className="truncate text-[17px] font-bold leading-[19px]">{name}</p>
        <p className="truncate text-[14px] leading-[18px] text-[#666]">
          18 connections played
        </p>
      </div>
      <Icon className="ml-auto size-[18px] shrink-0" name="chevron-right" />
    </div>
  );
}

export function NewsSidebar() {
  return (
    <aside className="news-column min-h-[696px] rounded-[10px] border border-[#d4d4d4] bg-white px-[20px] pb-[20px] pt-[13px] text-[#191919]">
      <div className="flex items-center justify-between">
        <h2 className="text-[25px] font-bold leading-[30px] tracking-[-0.025em]">
          LinkedIn News
        </h2>
        <Icon className="size-[17px] text-[#444]" name="info" />
      </div>

      <div className="mt-[11px]">
        {newsItems.map((item, index) => (
          <article className={index === 0 ? "" : "mt-[13px]"} key={item.lines[0]}>
            <h3 className="text-[18px] font-bold leading-[21px] tracking-[-0.035em]">
              {item.lines.map((line) => (
                <span className="block" key={line}>
                  {line}
                </span>
              ))}
            </h3>
            <p className="mt-[2px] text-[16px] leading-[19px] text-[#666]">
              {item.meta}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-[33px] flex items-center text-[18px] font-bold text-[#444]">
        <span>Show all news</span>
        <span className="ml-[8px] text-[22px] leading-none">&rarr;</span>
      </div>

      <h3 className="mt-[27px] text-[19px] font-bold text-[#666]">
        Today&apos;s puzzles
      </h3>

      <PuzzleRow icon={<WendIcon />} name="Wend #15" />
      <PuzzleRow icon={<PatchesIcon />} name="Patches #..." />
    </aside>
  );
}
