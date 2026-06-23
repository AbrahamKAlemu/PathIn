import { Avatar } from "./avatar";
import { Icon } from "./icons";

export function MessagingBar() {
  return (
    <div className="messaging-bar fixed bottom-4 right-4 z-50 flex h-[38px] w-[266px] items-center rounded-tl-[10px] border border-[#d4d4d4] bg-white px-[9px] shadow-[0_-3px_12px_rgba(0,0,0,0.08)]">
      <Avatar
        alt="Winston Iskandar"
        className="size-[28px] shrink-0"
        src="/linkedin/profile-small.png"
      />
      <span className="ml-[10px] text-[18px] text-[#222]">
        Messaging
      </span>
      <Icon className="ml-auto size-[17px] text-[#444]" name="more" />
      <Icon className="ml-[19px] size-[18px] text-[#444]" name="edit" />
      <Icon className="ml-[18px] size-[18px] text-[#222]" name="chevron-up" />
    </div>
  );
}
