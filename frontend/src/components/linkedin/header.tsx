import { Avatar } from "./avatar";
import { Icon, LinkedInLogo } from "./icons";

const navigation = [
  { icon: "home" as const, label: "Home", active: true },
  { icon: "network" as const, label: "My Network" },
  { icon: "briefcase" as const, label: "Jobs" },
  { icon: "message" as const, label: "Messaging" },
  { icon: "bell" as const, label: "Notifications", notifications: "25" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-[58px] border-b border-[#dedede] bg-white">
      <div className="linkedin-header-inner flex h-full items-center">
        <LinkedInLogo className="size-[34px] shrink-0 -translate-y-[3px] text-[34px]" />

        <div className="linkedin-search ml-[10px] flex h-[34px] w-[280px] shrink-0 -translate-y-[3px] items-center rounded-full border border-[#a6a6a6] px-[18px] text-[#555]">
          <Icon className="size-[16px] shrink-0 text-[#111]" name="search" />
          <span className="ml-[15px] truncate text-[13px] leading-none">
            I&apos;m looking for...
          </span>
        </div>

        <nav aria-label="Primary" className="linkedin-nav ml-auto grid h-full w-[667px] grid-cols-8">
          {navigation.map((item) => (
            <div
              aria-label={item.label}
              className={`relative flex h-full items-center justify-center pb-[6px] ${
                item.active ? "text-[#181818]" : "text-[#666]"
              }`}
              key={item.label}
            >
              <Icon className="size-[23px]" name={item.icon} />
              {item.notifications ? (
                <span className="absolute left-[45px] top-[7px] min-w-[33px] rounded-full bg-[#d3112a] px-[5px] py-px text-center text-[14px] font-bold leading-[18px] text-white">
                  {item.notifications}
                </span>
              ) : null}
              {item.active ? (
                <span className="absolute bottom-0 h-[2px] w-full bg-[#191919]" />
              ) : null}
            </div>
          ))}

          <div
            aria-label="Me"
            className="flex h-full items-center justify-center border-r border-[#dedede] pb-[6px]"
          >
            <Avatar
              alt="Winston Iskandar"
              className="size-[30px]"
              src="/linkedin/profile-small.png"
            />
          </div>

          <div aria-label="For Business" className="flex h-full items-center justify-center pb-[6px] text-[#666]">
            <Icon className="size-[24px]" name="grid" />
          </div>

          <div aria-label="Learning" className="flex h-full items-center justify-center pb-[6px] text-[#666]">
            <Icon className="h-[23px] w-[28px]" name="media" />
          </div>
        </nav>
      </div>
    </header>
  );
}

