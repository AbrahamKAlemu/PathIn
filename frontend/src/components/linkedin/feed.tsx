import Image from "next/image";

import { Avatar } from "./avatar";
import { Icon, LinkedInBadge } from "./icons";

function ComposerAction({
  icon,
  iconClass,
  label,
}: {
  icon: "article" | "image" | "play";
  iconClass: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-start text-[#444] max-[620px]:justify-center">
      <Icon
        className={`mr-[9px] size-[24px] max-[620px]:mr-[6px] max-[620px]:size-[20px] ${iconClass}`}
        name={icon}
      />
      <span className="text-[18px] font-bold leading-none max-[620px]:text-[14px]">
        {label}
      </span>
    </div>
  );
}

function PostComposer() {
  return (
    <section className="h-[145px] rounded-[10px] border border-[#d4d4d4] bg-white px-[20px] pt-[15px] max-[620px]:h-[128px] max-[620px]:px-[12px] max-[620px]:pt-[12px]">
      <div className="flex items-center">
        <Avatar
          alt="Winston Iskandar"
          className="size-[60px] shrink-0 max-[620px]:size-[48px]"
          src="/linkedin/profile-small.png"
        />
        <div className="ml-[11px] flex h-[56px] flex-1 items-center rounded-full border border-[#aaa] px-[24px] max-[620px]:ml-[10px] max-[620px]:h-[48px] max-[620px]:px-[16px]">
          <span className="whitespace-nowrap text-[20px] font-bold text-[#222] max-[620px]:text-[16px]">
            Start a post
          </span>
        </div>
      </div>

      <div className="composer-actions mt-[22px] grid grid-cols-[150px_150px_1fr] pl-[33px] max-[620px]:mt-[16px] max-[620px]:grid-cols-3 max-[620px]:pl-0">
        <ComposerAction icon="play" iconClass="text-[#4f812f]" label="Video" />
        <ComposerAction icon="image" iconClass="text-[#0a66c2]" label="Photo" />
        <ComposerAction icon="article" iconClass="text-[#b84725]" label="Write article" />
      </div>
    </section>
  );
}

function SortBar() {
  return (
    <div className="flex h-[40px] items-center">
      <span className="h-px flex-1 bg-[#d6d6d6]" />
      <span className="ml-[20px] text-[14px] text-[#666]">Sort by:</span>
      <span className="ml-[5px] text-[14px] font-bold text-[#555]">Top</span>
      <Icon className="ml-[8px] size-[11px] text-[#555]" name="chevron-down" />
    </div>
  );
}

function FeedPost() {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white text-[#191919]">
      <div className="flex h-[45px] items-center px-[15px] max-[620px]:h-[45px] max-[620px]:px-[12px]">
        <Avatar
          alt="Fazal Mittu"
          className="size-[30px] shrink-0"
          src="/linkedin/fazal.png"
        />
        <p className="ml-[10px] text-[15px] max-[620px]:ml-[8px] max-[620px]:text-[14px]">
          <strong>Fazal Mittu</strong> likes this
        </p>
        <Icon className="ml-auto size-[18px] text-[#444]" name="more" />
        <Icon className="ml-[19px] size-[18px] text-[#444]" name="close" />
      </div>

      <div className="mx-[15px] border-t border-[#dedede] pt-[10px] max-[620px]:mx-[12px]">
        <div className="flex">
          <Avatar
            alt="Arjun Lakhanpal"
            className="size-[60px] shrink-0 max-[620px]:size-[52px]"
            src="/linkedin/arjun.png"
          />

          <div className="ml-[11px] min-w-0 flex-1 max-[620px]:ml-[9px]">
            <div className="flex items-center">
              <h2 className="truncate text-[19px] font-bold leading-[21px] tracking-[-0.02em] max-[620px]:text-[17px]">
                Arjun Lakhanpal
              </h2>
              <LinkedInBadge className="ml-[6px] size-[14px] shrink-0 text-[9px] max-[620px]:ml-[4px] max-[620px]:size-[13px]" />
              <span className="ml-[6px] text-[14px] text-[#666] max-[620px]:ml-[4px] max-[620px]:text-[13px]">
                &middot; 2nd
              </span>
            </div>
            <p className="truncate text-[14px] leading-[18px] text-[#666] max-[620px]:text-[13px]">
              Founder @ Kara (YC S26) | Computer Science @ ...
            </p>
            <div className="flex items-center text-[14px] leading-[18px] text-[#666] max-[620px]:text-[13px]">
              <span>3h &middot;</span>
              <Icon className="ml-[4px] size-[14px]" name="globe" />
            </div>
          </div>

          <div className="ml-[11px] flex shrink-0 items-start pt-[4px] text-[#0a66c2] max-[620px]:ml-[6px] max-[620px]:pt-[2px]">
            <Icon className="size-[19px] max-[620px]:size-[17px]" name="plus" />
            <span className="ml-[4px] text-[18px] font-bold max-[620px]:ml-[3px] max-[620px]:text-[16px]">
              Follow
            </span>
          </div>
        </div>

        <p className="mt-[14px] text-[17px] leading-[21px] max-[620px]:text-[16px]">
          We just made history at{" "}
          <strong className="text-[#0a66c2]">Y Combinator</strong>.
        </p>

        <p className="mt-[27px] text-[16px] leading-[20px] text-[#666]">
          <span className="font-bold text-[#222]">...</span> more
        </p>
      </div>

      <div className="mx-[18px] mt-[14px]">
        <Image
          alt="Building exterior"
          className="h-auto w-full"
          height={349}
          src="/linkedin/post-building.png"
          width={1026}
          priority
        />
      </div>

      <div className="mx-[18px] flex h-[36px] items-center text-[13px] text-[#666]">
        <span>127 reactions</span>
        <span className="ml-auto">18 comments</span>
      </div>

      <div className="grid h-[48px] grid-cols-4 border-t border-[#dedede] text-center text-[14px] font-bold text-[#555]">
        {["Like", "Comment", "Repost", "Send"].map((label) => (
          <div className="flex items-center justify-center" key={label}>
            {label}
          </div>
        ))}
      </div>
    </article>
  );
}

export function Feed() {
  return (
    <section className="feed-column min-w-0">
      <PostComposer />
      <SortBar />
      <FeedPost />
    </section>
  );
}
