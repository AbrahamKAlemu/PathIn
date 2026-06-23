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
      <span className="text-[18px] leading-none max-[620px]:text-[14px]">
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
          <span className="whitespace-nowrap text-[20px] text-[#222] max-[620px]:text-[16px]">
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
      <span className="ml-[5px] text-[14px] text-[#555]">Top</span>
      <Icon className="ml-[8px] size-[11px] text-[#555]" name="chevron-down" />
    </div>
  );
}

const POST_ACTIONS = [
  { icon: "like" as const, label: "Like" },
  { icon: "comment" as const, label: "Comment" },
  { icon: "repost" as const, label: "Repost" },
  { icon: "forward" as const, label: "Send" },
];

function PostActionBar() {
  return (
    <div className="flex h-[48px] flex-wrap justify-around border-t border-[#dedede] text-[14px] text-[#555]">
      {POST_ACTIONS.map(({ icon, label }) => (
        <div className="flex flex-1 items-center justify-center gap-[6px]" key={label}>
          <Icon className="size-[18px]" name={icon} />
          {label}
        </div>
      ))}
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
            <span className="ml-[4px] text-[18px] max-[620px]:ml-[3px] max-[620px]:text-[16px]">
              Follow
            </span>
          </div>
        </div>

        <p className="mt-[14px] text-[17px] leading-[21px] max-[620px]:text-[16px]">
          We just made history at{" "}
          <strong className="text-[#0a66c2]">Y Combinator</strong>.
        </p>

        <p className="mt-[27px] text-[16px] leading-[20px] text-[#666]">
          <span className="text-[#222]">...</span> more
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

      <PostActionBar />
    </article>
  );
}

function FeedPostCareerAdvice() {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white text-[#191919]">
      <div className="mx-[15px] pt-[14px] max-[620px]:mx-[12px]">
        <div className="flex">
          <Avatar
            alt="Maya Johnson"
            className="size-[60px] shrink-0 max-[620px]:size-[52px]"
            src="/linkedin/fazal.png"
          />
          <div className="ml-[11px] min-w-0 flex-1 max-[620px]:ml-[9px]">
            <div className="flex items-center">
              <h2 className="truncate text-[19px] font-bold leading-[21px] tracking-[-0.02em] max-[620px]:text-[17px]">
                Maya Johnson
              </h2>
              <span className="ml-[6px] text-[14px] text-[#666] max-[620px]:ml-[4px] max-[620px]:text-[13px]">
                &middot; 2nd
              </span>
            </div>
            <p className="truncate text-[14px] leading-[18px] text-[#666] max-[620px]:text-[13px]">
              Senior SWE @ Google · ex-Meta · Stanford CS &apos;21
            </p>
            <div className="flex items-center text-[14px] leading-[18px] text-[#666] max-[620px]:text-[13px]">
              <span>5h &middot;</span>
              <Icon className="ml-[4px] size-[14px]" name="globe" />
            </div>
          </div>
          <div className="ml-[11px] flex shrink-0 items-start pt-[4px] text-[#0a66c2] max-[620px]:ml-[6px]">
            <Icon className="size-[19px]" name="plus" />
            <span className="ml-[4px] text-[18px]">Follow</span>
          </div>
        </div>

        <p className="mt-[14px] text-[17px] leading-[24px] max-[620px]:text-[16px]">
          3 things I wish someone told me before my first tech interview:
        </p>
        <p className="mt-[10px] text-[16px] leading-[22px] text-[#444] max-[620px]:text-[15px]">
          1. Your résumé gets you the interview — your communication wins the offer. Practice explaining your projects out loud, not just on paper.
          <br /><br />
          2. Behavioral questions are not filler. &ldquo;Tell me about a conflict&rdquo; is the interviewer asking if they can work with you for years.
          <br /><br />
          3. It&rsquo;s okay to say &ldquo;I don&rsquo;t know, but here&rsquo;s how I&rsquo;d think through it.&rdquo; Intellectual honesty &gt; faking confidence.
        </p>
        <p className="mt-[10px] text-[16px] leading-[20px] text-[#666]">
          <span className="text-[#222]">...</span> more
        </p>
      </div>

      <div className="mx-[18px] flex h-[36px] items-center text-[13px] text-[#666]">
        <span>841 reactions</span>
        <span className="ml-auto">94 comments</span>
      </div>

      <PostActionBar />
    </article>
  );
}

function FeedPostAnnouncement() {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white text-[#191919]">
      <div className="mx-[15px] pt-[14px] max-[620px]:mx-[12px]">
        <div className="flex">
          <Avatar
            alt="Marcus Williams"
            className="size-[60px] shrink-0 max-[620px]:size-[52px]"
            src="/linkedin/arjun.png"
          />
          <div className="ml-[11px] min-w-0 flex-1 max-[620px]:ml-[9px]">
            <div className="flex items-center">
              <h2 className="truncate text-[19px] font-bold leading-[21px] tracking-[-0.02em] max-[620px]:text-[17px]">
                Marcus Williams
              </h2>
              <span className="ml-[6px] text-[14px] text-[#666]">&middot; 1st</span>
            </div>
            <p className="truncate text-[14px] leading-[18px] text-[#666] max-[620px]:text-[13px]">
              CS &apos;26 @ MIT · incoming SWE intern @ Stripe
            </p>
            <div className="flex items-center text-[14px] leading-[18px] text-[#666]">
              <span>1d &middot;</span>
              <Icon className="ml-[4px] size-[14px]" name="globe" />
            </div>
          </div>
        </div>

        <p className="mt-[14px] text-[17px] leading-[24px] max-[620px]:text-[16px]">
          Thrilled to share that I&rsquo;ll be joining{" "}
          <strong className="text-[#0a66c2]">Stripe</strong> this summer as a Software Engineering Intern! 🎉
          <br /><br />
          Huge thanks to everyone who reviewed my résumé, mock-interviewed me, and encouraged me when things got tough. This one&rsquo;s for you.
        </p>
      </div>

      <div className="mx-[18px] flex h-[36px] items-center text-[13px] text-[#666]">
        <span>2.1k reactions</span>
        <span className="ml-auto">207 comments</span>
      </div>

      <PostActionBar />
    </article>
  );
}

function FeedPostImage() {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white text-[#191919]">
      <div className="mx-[15px] pt-[14px] max-[620px]:mx-[12px]">
        <div className="flex">
          <Avatar
            alt="Priya Patel"
            className="size-[60px] shrink-0 max-[620px]:size-[52px]"
            src="/linkedin/profile-small.png"
          />
          <div className="ml-[11px] min-w-0 flex-1 max-[620px]:ml-[9px]">
            <div className="flex items-center">
              <h2 className="truncate text-[19px] font-bold leading-[21px] tracking-[-0.02em] max-[620px]:text-[17px]">
                Priya Patel
              </h2>
              <LinkedInBadge className="ml-[6px] size-[14px] shrink-0 text-[9px]" />
              <span className="ml-[6px] text-[14px] text-[#666]">&middot; 2nd</span>
            </div>
            <p className="truncate text-[14px] leading-[18px] text-[#666] max-[620px]:text-[13px]">
              PM @ Figma · Product-led growth · Berkeley MBA
            </p>
            <div className="flex items-center text-[14px] leading-[18px] text-[#666]">
              <span>2d &middot;</span>
              <Icon className="ml-[4px] size-[14px]" name="globe" />
            </div>
          </div>
          <div className="ml-[11px] flex shrink-0 items-start pt-[4px] text-[#0a66c2]">
            <Icon className="size-[19px]" name="plus" />
            <span className="ml-[4px] text-[18px]">Follow</span>
          </div>
        </div>

        <p className="mt-[14px] text-[17px] leading-[21px] max-[620px]:text-[16px]">
          Our new office is open. The views are not bad either 🏙️
        </p>
        <p className="mt-[6px] text-[16px] leading-[20px] text-[#666]">
          <span className="text-[#222]">...</span> more
        </p>
      </div>

      <div className="mx-[18px] mt-[12px]">
        <Image
          alt="Office building with city view"
          className="h-auto w-full"
          height={349}
          src="/linkedin/post-building.png"
          width={1026}
        />
      </div>

      <div className="mx-[18px] flex h-[36px] items-center text-[13px] text-[#666]">
        <span>563 reactions</span>
        <span className="ml-auto">41 comments</span>
      </div>

      <PostActionBar />
    </article>
  );
}

function FeedPostThought() {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[#d4d4d4] bg-white text-[#191919]">
      <div className="mx-[15px] pt-[14px] max-[620px]:mx-[12px]">
        <div className="flex">
          <Avatar
            alt="James Rodriguez"
            className="size-[60px] shrink-0 max-[620px]:size-[52px]"
            src="/linkedin/fazal.png"
          />
          <div className="ml-[11px] min-w-0 flex-1 max-[620px]:ml-[9px]">
            <div className="flex items-center">
              <h2 className="truncate text-[19px] font-bold leading-[21px] tracking-[-0.02em] max-[620px]:text-[17px]">
                James Rodriguez
              </h2>
              <span className="ml-[6px] text-[14px] text-[#666]">&middot; 3rd+</span>
            </div>
            <p className="truncate text-[14px] leading-[18px] text-[#666] max-[620px]:text-[13px]">
              Co-founder @ Novu (YC W23) · prev Robinhood
            </p>
            <div className="flex items-center text-[14px] leading-[18px] text-[#666]">
              <span>3d &middot;</span>
              <Icon className="ml-[4px] size-[14px]" name="globe" />
            </div>
          </div>
          <div className="ml-[11px] flex shrink-0 items-start pt-[4px] text-[#0a66c2]">
            <Icon className="size-[19px]" name="plus" />
            <span className="ml-[4px] text-[18px]">Follow</span>
          </div>
        </div>

        <p className="mt-[14px] text-[17px] leading-[24px] max-[620px]:text-[16px]">
          Hot take: the best thing about building a startup in your 20s is not the equity. It&rsquo;s the speed at which you learn what you&rsquo;re actually bad at.
          <br /><br />
          Nothing humbles you faster than shipping to real users.
        </p>
      </div>

      <div className="mx-[18px] flex h-[36px] items-center text-[13px] text-[#666]">
        <span>1.4k reactions</span>
        <span className="ml-auto">138 comments</span>
      </div>

      <PostActionBar />
    </article>
  );
}

export function Feed() {
  return (
    <section className="feed-column min-w-0">
      <PostComposer />
      <SortBar />
      <div className="flex flex-col gap-[8px]">
        <FeedPost />
        <FeedPostCareerAdvice />
        <FeedPostAnnouncement />
        <FeedPostImage />
        <FeedPostThought />
      </div>
      <p className="my-[32px] text-center text-[14px] text-[#888]">
        You&rsquo;re all caught up ✓
      </p>
    </section>
  );
}

