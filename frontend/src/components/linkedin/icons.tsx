type IconName =
  | "article"
  | "bell"
  | "briefcase"
  | "chevron-down"
  | "chevron-right"
  | "chevron-up"
  | "close"
  | "edit"
  | "globe"
  | "grid"
  | "home"
  | "image"
  | "info"
  | "media"
  | "message"
  | "more"
  | "network"
  | "play"
  | "plus"
  | "search";

type IconProps = {
  name: IconName;
  className?: string;
};

export function Icon({ name, className = "size-6" }: IconProps) {
  const common = {
    "aria-hidden": true,
    className,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "search":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.8">
          <circle cx="10.6" cy="10.6" r="6.1" />
          <path d="m15.2 15.2 5 5" strokeLinecap="round" />
        </svg>
      );
    case "home":
      return (
        <svg {...common} fill="currentColor">
          <path d="M2.5 10.6 12 2.8l9.5 7.8-1.7 2-1.6-1.3v9.2h-5.1v-6.2H10v6.2H4.8v-9.2l-1.6 1.3-1.7-2Z" />
        </svg>
      );
    case "network":
      return (
        <svg {...common} fill="currentColor">
          <circle cx="8" cy="6.2" r="3.5" />
          <circle cx="17.6" cy="7.6" r="2.9" />
          <path d="M2.7 20.4v-5.3c0-2.8 2.3-5.1 5.1-5.1s5.1 2.3 5.1 5.1v5.3H2.7Zm11.9 0v-4.2c0-1.7-.5-3.2-1.5-4.5a4.8 4.8 0 0 1 2.7-.8c2.8 0 5 2.3 5 5.1v4.4h-6.2Z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common} fill="currentColor">
          <path d="M9.2 4.2h5.6V2.8H9.2v1.4Zm-2.6 0V2.9A2.4 2.4 0 0 1 9 0h6a2.4 2.4 0 0 1 2.4 2.4v1.8H21a2.4 2.4 0 0 1 2.4 2.4v3.6c-3 1.4-6.8 2.1-11.4 2.1S3.6 11.6.6 10.2V6.6a2.4 2.4 0 0 1 2.4-2.4h3.6ZM.6 12.8c3 1.2 6.8 1.8 11.4 1.8s8.4-.6 11.4-1.8v6.4a2.4 2.4 0 0 1-2.4 2.4H3a2.4 2.4 0 0 1-2.4-2.4v-6.4Z" />
        </svg>
      );
    case "message":
      return (
        <svg {...common} fill="currentColor">
          <path d="M2 3.4h20v13.2H11.1L6.2 21v-4.4H2V3.4Zm4.2 7.8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm5.8 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm5.8 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 23a3.1 3.1 0 0 0 3-2H9a3.1 3.1 0 0 0 3 2Zm8.5-5H3.4c-.9 0-1.3-1.1-.7-1.7l1.7-1.8V9.1a7.6 7.6 0 0 1 6.1-7.4V.9a1.5 1.5 0 1 1 3 0v.8a7.6 7.6 0 0 1 6.1 7.4v5.4l1.7 1.8c.6.6.1 1.7-.8 1.7Z" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common} fill="currentColor">
          {[3, 10, 17].flatMap((x) =>
            [3, 10, 17].map((y) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" />
            )),
          )}
        </svg>
      );
    case "media":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2.2" y="4.1" width="19.6" height="15.8" rx="1" />
          <path d="M7.6 4.2v15.6M16.4 4.2v15.6M2.4 8h5.1M2.4 16h5.1M16.5 8h5M16.5 16h5" />
          <path d="m10.3 8.3 4.6 3.7-4.6 3.7V8.3Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} fill="currentColor">
          <rect x="1" y="4" width="22" height="16" rx="2.5" />
          <path d="m10 8.2 6 3.8-6 3.8V8.2Z" fill="white" />
        </svg>
      );
    case "image":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <circle cx="16.3" cy="8.2" r="2.1" fill="currentColor" stroke="none" />
          <path d="m3.4 17.8 5.1-5.2 3.5 3.5 2.1-2.1 6.5 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "article":
      return (
        <svg {...common} fill="currentColor">
          <path d="M2 2h5v20H2V2Zm7 0h13v3H9V2Zm0 5h13v3H9V7Zm0 5h13v3H9v-3Zm0 5h13v3H9v-3Z" />
        </svg>
      );
    case "info":
      return (
        <svg {...common} fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
          <circle cx="12" cy="7.2" r="1.5" fill="white" />
          <path d="M10.7 10h2.8l-1.1 6.4h1.3v1.8H9.9v-1.8h.8l.8-4.6h-.8V10Z" fill="white" />
        </svg>
      );
    case "more":
      return (
        <svg {...common} fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      );
    case "close":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeLinecap="square" strokeWidth="2.8">
          <path d="m5 5 14 14M19 5 5 19" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeLinecap="square" strokeWidth="2.4">
          <path d="M12 3v18M3 12h18" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M3.4 12h17.2M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
          <path d="m9 5 7 7-7 7" />
        </svg>
      );
    case "chevron-up":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
          <path d="m5 15 7-7 7 7" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3">
          <path d="M13.7 5.2 18.8 10M4 20l1.1-5.3L16.7 3.1a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8L9.3 18.9 4 20Z" />
          <path d="M13 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-8" />
        </svg>
      );
  }
}

export function LinkedInLogo({ className = "" }: { className?: string }) {
  return (
    <div
      aria-label="LinkedIn"
      className={`flex items-center justify-center rounded-[3px] bg-[#0a66c2] font-sans text-white ${className}`}
    >
      <span className="translate-y-[1px] text-[0.96em] font-bold tracking-[-0.1em]">
        in
      </span>
    </div>
  );
}

export function LinkedInBadge({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-[2px] bg-[#c36a04] font-sans font-bold leading-none text-white ${className}`}
    >
      in
    </span>
  );
}
