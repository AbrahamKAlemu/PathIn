"use client";

import { useState } from "react";

import { Avatar } from "./avatar";
import { Icon } from "./icons";

export function MessagingBar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="messaging-bar fixed bottom-0 right-4 z-50 w-[320px] overflow-hidden rounded-t-[10px] border border-[#d4d4d4] bg-white shadow-[0_-3px_12px_rgba(0,0,0,0.12)]">
      {open ? (
        <section
          aria-label="Messaging"
          className="h-[360px] border-b border-[#dedede] bg-white"
        >
          <div className="border-b border-[#dedede] p-[14px]">
            <strong className="text-[16px]">Messaging</strong>
            <div className="mt-[10px] flex h-[34px] items-center rounded-[5px] bg-[#edf3f8] px-[10px] text-[#666]">
              <Icon className="size-[16px]" name="search" />
              <span className="ml-[8px] text-[13px]">Search messages</span>
            </div>
          </div>
          <div className="grid place-items-center px-[30px] py-[66px] text-center">
            <Icon className="size-[42px] text-[#777]" name="message" />
            <strong className="mt-[13px] text-[15px]">
              No prototype conversations
            </strong>
            <p className="mt-[5px] text-[13px] leading-[18px] text-[#666]">
              Messaging is scaffolded without creating or sending real
              LinkedIn messages.
            </p>
          </div>
        </section>
      ) : null}

      <button
        aria-expanded={open}
        className="flex h-[48px] w-full items-center border-0 bg-white px-[11px] text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Avatar
          alt="Winston Iskandar"
          className="size-[30px] shrink-0"
          src="/linkedin/profile-small.png"
        />
        <span className="ml-[10px] text-[17px] font-semibold text-[#222]">
          Messaging
        </span>
        <Icon className="ml-auto size-[17px] text-[#444]" name="more" />
        <Icon className="ml-[18px] size-[18px] text-[#444]" name="edit" />
        <Icon
          className="ml-[17px] size-[18px] text-[#222]"
          name={open ? "chevron-down" : "chevron-up"}
        />
      </button>
    </div>
  );
}
