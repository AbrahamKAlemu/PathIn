import type { ProfileCategory } from "@/features/pathin/types";

import type { CurrentProfile } from "./types";

const categories: ProfileCategory[] = [
  "education",
  "coursework",
  "roles",
  "responsibilities",
  "dates",
  "projects",
  "skills",
  "certifications",
  "industries",
  "achievements",
  "interests",
  "locations",
  "goals",
  "workStyles",
];

const enabledCategories = categories.reduce(
  (result, category) => {
    result[category] = true;
    return result;
  },
  {} as Record<ProfileCategory, boolean>,
);

export const DEFAULT_CURRENT_PROFILE: CurrentProfile = {
  id: "winstoniskandar",
  slug: "winstoniskandar",
  name: "Winston Iskandar",
  headline: "Similate, Inc. (SR007) | CS/Math @ Stanford",
  location: "United States",
  connectionCount: "500+",
  followerCount: 982,
  profileLanguage: "English",
  publicUrl: "www.linkedin.com/in/winstoniskandar",
  profilePhoto: "/linkedin/profile.png",
  cover: {
    kind: "solid",
    value: "#000000",
  },
  affiliations: [
    {
      id: "jane-street",
      name: "Jane Street",
      logo: "/linkedin/jane-street.png",
    },
    {
      id: "stanford",
      name: "Stanford University",
      logo: "/linkedin/stanford.svg",
    },
  ],
  analytics: {
    profileViews: 652,
    postImpressions: 0,
    searchAppearances: 150,
    period: "Past 7 days",
  },
  activity: [
    {
      id: "comment-1",
      kind: "comment",
      age: "2mo",
      text: "Damn is that the 2 sig guy",
    },
    {
      id: "comment-2",
      kind: "comment",
      age: "3mo",
      text: "Super agree",
    },
  ],
  experience: [
    {
      id: "similate-ceo",
      title: "ceo",
      company: "Similate",
      employmentType: "",
      startDate: "Apr 2026",
      endDate: "Present",
      duration: "3 mos",
      location: "",
      description: [],
      logo: "/linkedin/simulate-mark.png",
    },
    {
      id: "jane-street-fttp",
      title: "fttp",
      company: "Jane Street",
      employmentType: "",
      startDate: "Feb 2026",
      endDate: "Present",
      duration: "5 mos",
      location: "New York, New York, United States",
      description: [],
      logo: "/linkedin/jane-street.png",
    },
    {
      id: "stanford-markets",
      title: "studying markets",
      company: "Stanford University",
      employmentType: "Part-time",
      startDate: "Dec 2025",
      endDate: "Present",
      duration: "7 mos",
      location: "",
      description: [
        "blockchain and ai research // Advanced Financial Technology Lab",
      ],
      logo: "/linkedin/stanford.svg",
    },
    {
      id: "mit-research",
      title: "research",
      company: "Massachusetts Institute of Technology",
      employmentType: "Internship",
      startDate: "Jun 2022",
      endDate: "Aug 2025",
      duration: "3 yrs 3 mos",
      location: "Cambridge, Massachusetts, United States",
      description: [
        "presented live demo of music making web-app at TEDx talk",
      ],
      logo: "/linkedin/mit.svg",
    },
    {
      id: "dartmouth-research",
      title: "research",
      company: "Thayer School of Engineering at Dartmouth",
      employmentType: "Internship",
      startDate: "Feb 2022",
      endDate: "Aug 2025",
      duration: "3 yrs 7 mos",
      location: "Hanover, New Hampshire, United States",
      description: [
        "published paper at ACM CHI 2024, built AI literacy apps, ran user studies",
      ],
      logo: "/linkedin/dartmouth.svg",
    },
  ],
  education: [
    {
      id: "stanford-education",
      school: "Stanford University",
      degree: "Mathematics and Computer Science",
      dates: "",
      description: [
        "BASES (director), blockchain, poker, effective altruism, piano society",
      ],
      logo: "/linkedin/stanford.svg",
    },
    {
      id: "colburn-education",
      school: "Colburn School of Music",
      degree: "",
      dates: "2011 - 2025",
      description: [
        "Performed in NYC for solo piano debut at Carnegie Hall, Spring 2022",
      ],
      logo: "/linkedin/colburn.svg",
    },
  ],
  connectedApps: [
    { id: "gamma", name: "Gamma", mark: "G" },
    { id: "intellij", name: "IntelliJ IDEA", mark: "IJ" },
    { id: "hubspot", name: "HubSpot", mark: "H" },
    { id: "replit", name: "Replit", mark: "R" },
  ],
  skills: [
    {
      id: "software-development",
      name: "Software Development",
      endorsementCount: 19,
      endorsementNotes: [
        "Endorsed by 2 colleagues at Jane Street",
        "Endorsed by 2 people in the last 6 months",
      ],
    },
    {
      id: "freelance-web-app-development",
      name: "Freelance Web/App Development",
      endorsementCount: 13,
      endorsementNotes: [],
    },
  ],
  skillCount: 25,
  recommendations: {
    receivedCount: 1,
    givenCount: 0,
    receivedVisible: false,
  },
  honors: [
    {
      id: "emergent-ventures",
      name: "4x Emergent Ventures",
      issuer: "EV",
      issued: "Feb 2026",
    },
    {
      id: "google-scholar",
      name: "Google Scholar",
      issuer: "Google",
      issued: "Oct 2025",
    },
  ],
  honorCount: 7,
  interests: {
    activeTab: "Top Voices",
    tabs: ["Top Voices", "Companies", "Groups", "Newsletters", "Schools"],
    items: [
      {
        id: "brad-jacobs",
        tab: "Top Voices",
        name: "Brad Jacobs",
        relationship: "2nd",
        headline: "Chairman and CEO, QXO, Inc.",
        followers: "127,660 followers",
      },
      {
        id: "jane-street-company",
        tab: "Companies",
        name: "Jane Street",
        relationship: "",
        headline: "Financial Services",
        followers: "",
      },
      {
        id: "stanford-school",
        tab: "Schools",
        name: "Stanford University",
        relationship: "",
        headline: "Higher Education",
        followers: "",
      },
    ],
  },
  viewerSuggestions: [
    {
      id: "kelly-tai",
      name: "Kelly Tai",
      relationship: "2nd",
      headline: "CS + Math @ Yale",
      initials: "KT",
    },
    {
      id: "aidan-duncan",
      name: "Aidan Duncan",
      relationship: "2nd",
      headline: "Math + CS @ MIT",
      initials: "AD",
    },
    {
      id: "noga-gercsak",
      name: "Noga Gercsak",
      relationship: "2nd",
      headline: "Incoming CS @ Carnegie Mellon | Jane Street AMP '26",
      initials: "NG",
    },
  ],
  peopleYouMayKnow: [
    {
      id: "davido-zhang",
      name: "Davido Zhang",
      relationship: "2nd",
      headline: "Stanford Math & EE | Phillips Exeter | RSI | Z Fellows",
      initials: "DZ",
    },
    {
      id: "micky-de-la-rosa",
      name: "Micky M Dela Rosa",
      relationship: "3rd+",
      headline: "Student at Stanford University",
      initials: "MD",
    },
    {
      id: "brian-yip",
      name: "Brian Yip",
      relationship: "2nd",
      headline: "Stanford University '29 | Symbolic Systems and Design",
      initials: "BY",
    },
    {
      id: "gusti-randa",
      name: "Gusti Randa",
      relationship: "3rd+",
      headline: "Student at Stanford University",
      initials: "GR",
    },
    {
      id: "angel-raychev",
      name: "Angel Raychev",
      relationship: "2nd",
      headline: "Giving up - Couldn't be me",
      initials: "AR",
    },
  ],
  suggestedPages: [
    {
      id: "two-sigma",
      name: "Two Sigma",
      industry: "Financial Services",
      followers: "289,473 followers",
      context: "Peter & 1 other connection work here",
      initials: "2S",
    },
    {
      id: "jump-trading",
      name: "Jump Trading",
      industry: "Financial Services",
      followers: "131,085 followers",
      context: "Avery & 32 other connections follow this page",
      initials: "JT",
    },
  ],
  projects: [
    "Music-making web application presented in a live TEDx demo",
    "AI literacy applications and user studies",
    "ACM CHI 2024 research paper",
  ],
  industries: [
    "Technology",
    "Financial Services",
    "Artificial Intelligence",
    "Research",
    "Education",
    "Music",
  ],
  careerInterests: [
    "Markets",
    "Blockchain",
    "Artificial intelligence",
    "Entrepreneurship",
    "Effective altruism",
    "Piano",
  ],
  careerGoals: [],
  workStyles: [
    "Entrepreneurial",
    "Research-oriented",
    "Interdisciplinary",
  ],
  enabledCategories,
  provenance: {
    source: "user_supplied_linkedin_profile",
    authorized: true,
    scraped: false,
    description:
      "Profile facts supplied by the user for this PathIn prototype. No LinkedIn credentials or scraping are used.",
  },
  schemaVersion: "pathin-current-profile-1.0",
  updatedAt: "2026-06-23T00:00:00+00:00",
  pathinEvidence: {
    fields: categories.reduce(
      (result, category) => {
        result[category] = [];
        return result;
      },
      {} as CurrentProfile["pathinEvidence"]["fields"],
    ),
    enabledCategories,
    source: "linkedin",
    sourceLabel: "User-authorized LinkedIn-style profile",
    privacy:
      "Only enabled categories are sent to PathIn. Analytics, viewer suggestions, and social recommendations are never used for ranking.",
  },
};
