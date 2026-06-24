import Link from "next/link";

import { Icon } from "./icons";

const capabilities = [
  {
    icon: "network" as const,
    title: "Compare credible directions",
    detail:
      "Explore ranks role families from enabled profile evidence, maintained occupational data, and privacy-screened synthetic PIT aggregates.",
  },
  {
    icon: "briefcase" as const,
    title: "Build a route to one goal",
    detail:
      "Build My Path generates two distinct strategies: create role-specific proof or gain adjacent responsibilities.",
  },
  {
    icon: "search" as const,
    title: "Inspect every recommendation",
    detail:
      "Open any step to review its score, profile signals, gaps, uncertainty, source, and completion evidence.",
  },
];

export function Feed() {
  return (
    <section className="feed-column min-w-0">
      <article className="overflow-hidden rounded-[12px] border border-[#d4d4d4] bg-white">
        <div className="border-b border-[#e4e4e4] bg-gradient-to-br from-[#e7f3ff] via-white to-white px-[28px] py-[27px] max-[620px]:px-[20px]">
          <div className="flex items-center gap-[11px]">
            <span className="grid size-[42px] place-items-center rounded-[9px] bg-[#0a66c2] text-[16px] font-bold text-white">
              in
            </span>
            <div>
              <p className="text-[18px] font-bold leading-[21px]">PathIn</p>
              <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[#0a66c2]">
                Explainable career exploration
              </p>
            </div>
          </div>

          <h1 className="mt-[25px] max-w-[620px] text-[32px] font-bold leading-[38px] tracking-[-0.03em] text-[#191919] max-[620px]:text-[27px] max-[620px]:leading-[33px]">
            Turn the profile you control into career routes you can inspect.
          </h1>
          <p className="mt-[13px] max-w-[650px] text-[17px] leading-[25px] text-[#555]">
            Start with the authorized profile already shown here. A resume is
            optional and adds evidence only when you choose to upload one.
          </p>

          <div className="mt-[23px] flex flex-wrap gap-[10px]">
            <Link
              className="rounded-full bg-[#0a66c2] px-[22px] py-[10px] text-[15px] font-bold text-white hover:bg-[#004182]"
              href="/career-tree"
            >
              Explore career paths
            </Link>
            <Link
              className="rounded-full border border-[#0a66c2] px-[22px] py-[9px] text-[15px] font-bold text-[#0a66c2] hover:bg-[#edf3f8]"
              href="/in/winstoniskandar"
            >
              Review profile evidence
            </Link>
          </div>
        </div>

        <div className="grid gap-px bg-[#e4e4e4] md:grid-cols-3">
          {capabilities.map((capability) => (
            <section
              className="bg-white px-[22px] py-[22px]"
              key={capability.title}
            >
              <Icon
                className="size-[23px] text-[#0a66c2]"
                name={capability.icon}
              />
              <h2 className="mt-[12px] text-[16px] font-bold leading-[20px]">
                {capability.title}
              </h2>
              <p className="mt-[7px] text-[14px] leading-[20px] text-[#666]">
                {capability.detail}
              </p>
            </section>
          ))}
        </div>
      </article>

      <article className="mt-[10px] rounded-[12px] border border-[#d4d4d4] bg-white px-[25px] py-[22px]">
        <h2 className="text-[19px] font-bold">Recommendation boundaries</h2>
        <ul className="mt-[12px] grid gap-[9px] text-[14px] leading-[20px] text-[#555]">
          <li>Only enabled profile categories and optional uploaded evidence are scored.</li>
          <li>Social activity, analytics, demographics, and private messages are excluded.</li>
          <li>Results are explainable possibilities, not hiring predictions or guarantees.</li>
        </ul>
      </article>
    </section>
  );
}
