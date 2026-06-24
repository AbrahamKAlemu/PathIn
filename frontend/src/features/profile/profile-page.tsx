"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Icon, LinkedInBadge } from "@/components/linkedin/icons";
import type { ProfileCategory } from "@/features/pathin/types";

import { getCurrentProfile, updateCurrentProfile } from "./profile-api";
import { DEFAULT_CURRENT_PROFILE } from "./profile-data";
import styles from "./profile.module.css";
import type {
  CurrentProfile,
  CurrentProfilePatch,
  ProfileEducation,
  ProfileExperience,
  ProfileHonor,
  ProfilePerson,
  ProfileSkill,
} from "./types";

type DialogKind =
  | "add-section"
  | "contact"
  | "edit"
  | "experience"
  | "honors"
  | "open-to"
  | "resources"
  | "skills"
  | null;

const categoryLabels: Partial<Record<ProfileCategory, string>> = {
  education: "Education",
  coursework: "Coursework",
  roles: "Roles and titles",
  responsibilities: "Responsibilities",
  dates: "Dates",
  projects: "Projects",
  skills: "Skills",
  industries: "Industries",
  achievements: "Achievements",
  interests: "Interests",
  locations: "Locations",
  goals: "Career goals",
  workStyles: "Work style",
};

export function ProfilePage() {
  const [profile, setProfile] = useState(DEFAULT_CURRENT_PROFILE);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [activeInterestTab, setActiveInterestTab] = useState(
    DEFAULT_CURRENT_PROFILE.interests.activeTab,
  );
  const [connectedPeople, setConnectedPeople] = useState<string[]>([]);
  const [followedItems, setFollowedItems] = useState<string[]>([
    "brad-jacobs",
  ]);
  const [compactHeaderVisible, setCompactHeaderVisible] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);

  useEffect(() => {
    let active = true;
    getCurrentProfile()
      .then((currentProfile) => {
        if (active) {
          setProfile(currentProfile);
          setActiveInterestTab(currentProfile.interests.activeTab);
        }
      })
      .catch(() => {
        if (active) {
          setLoadMessage(
            "Showing the local profile copy. Saved edits are temporarily unavailable.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function updateCompactHeader() {
      setCompactHeaderVisible(window.scrollY > 410);
    }
    updateCompactHeader();
    window.addEventListener("scroll", updateCompactHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateCompactHeader);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  }

  function toggleConnection(id: string) {
    setConnectedPeople((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleFollow(id: string) {
    setFollowedItems((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function saveProfile(patch: CurrentProfilePatch) {
    const updated = await updateCurrentProfile(patch);
    setProfile(updated);
    setDialog(null);
    showToast("Profile changes saved and available to Path[IN].");
  }

  const interestItems = useMemo(
    () =>
      profile.interests.items.filter(
        (item) => item.tab === activeInterestTab,
      ),
    [activeInterestTab, profile.interests.items],
  );

  return (
    <>
      <CompactProfileHeader
        onOpenDialog={setDialog}
        profile={profile}
        visible={compactHeaderVisible}
      />

      <div className={styles.profilePage}>
        {loadMessage ? (
          <p className={styles.loadNotice} role="status">
            {loadMessage}
          </p>
        ) : null}

        <div className={styles.profileLayout}>
          <div className={styles.profileMain}>
            <ProfileHero onOpenDialog={setDialog} profile={profile} />

            <SuggestedCard />

            <AnalyticsCard profile={profile} />

            <ResourcesCard onOpenDialog={setDialog} />

            <ActivityCard profile={profile} />

            <ExperienceCard
              experiences={profile.experience}
              onEdit={() => setDialog("edit")}
              onShowAll={() => setDialog("experience")}
            />

            <EducationCard
              education={profile.education}
              onEdit={() => setDialog("edit")}
            />

            <ConnectedAppsCard
              apps={profile.connectedApps}
              onAction={showToast}
            />

            <SkillsCard
              onEdit={() => setDialog("edit")}
              onShowAll={() => setDialog("skills")}
              skillCount={profile.skillCount}
              skills={profile.skills}
            />

            <RecommendationsCard profile={profile} />

            <HonorsCard
              honorCount={profile.honorCount}
              honors={profile.honors}
              onEdit={() => setDialog("edit")}
              onShowAll={() => setDialog("honors")}
            />

            <InterestsCard
              activeTab={activeInterestTab}
              followedItems={followedItems}
              items={interestItems}
              onTabChange={setActiveInterestTab}
              onToggleFollow={toggleFollow}
              profile={profile}
            />
          </div>

          <ProfileRightRail
            connectedPeople={connectedPeople}
            followedItems={followedItems}
            onEdit={() => setDialog("edit")}
            onToggleConnection={toggleConnection}
            onToggleFollow={toggleFollow}
            profile={profile}
          />
        </div>
      </div>

      {toast ? (
        <div aria-live="polite" className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}

      <ProfileDialog
        dialog={dialog}
        onClose={closeDialog}
        onSaveProfile={saveProfile}
        onScaffoldAction={(message) => {
          setDialog(null);
          showToast(message);
        }}
        profile={profile}
      />
    </>
  );
}

function CompactProfileHeader({
  onOpenDialog,
  profile,
  visible,
}: {
  onOpenDialog: (dialog: DialogKind) => void;
  profile: CurrentProfile;
  visible: boolean;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={styles.compactHeader}
      data-visible={visible ? "true" : "false"}
      inert={!visible}
    >
      <div className={styles.compactHeaderInner}>
        <Image
          alt=""
          className={styles.compactAvatar}
          height={52}
          src={profile.profilePhoto}
          width={52}
        />
        <div className={styles.compactIdentity}>
          <strong>{profile.name}</strong>
          <span>{profile.headline}</span>
        </div>
        <div className={styles.compactActions}>
          <OutlineButton onClick={() => onOpenDialog("resources")}>
            Resources
          </OutlineButton>
          <OutlineButton onClick={() => onOpenDialog("add-section")}>
            Add section
          </OutlineButton>
          <PrimaryButton onClick={() => onOpenDialog("open-to")}>
            Open to
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function ProfileHero({
  onOpenDialog,
  profile,
}: {
  onOpenDialog: (dialog: DialogKind) => void;
  profile: CurrentProfile;
}) {
  return (
    <section className={`${styles.card} ${styles.heroCard}`}>
      <div
        className={styles.cover}
        style={{ backgroundColor: profile.cover.value }}
      >
        <IconButton
          label="Edit cover photo"
          onClick={() => onOpenDialog("edit")}
        >
          <PencilIcon />
        </IconButton>
      </div>

      <Image
        alt={profile.name}
        className={styles.heroAvatar}
        height={380}
        priority
        src={profile.profilePhoto}
        width={380}
      />

      <div className={styles.heroEdit}>
        <IconButton
          label="Edit profile introduction"
          onClick={() => onOpenDialog("edit")}
          transparent
        >
          <PencilIcon />
        </IconButton>
      </div>

      <div className={styles.heroBody}>
        <div className={styles.heroDetails}>
          <div className={styles.nameLine}>
            <h1>{profile.name}</h1>
            <LinkedInBadge className={styles.linkedinBadge} />
          </div>
          <button
            className={styles.verificationButton}
            onClick={() =>
              onOpenDialog("resources")
            }
            type="button"
          >
            <VerificationIcon />
            Add verification badge
          </button>
          <p className={styles.headline}>{profile.headline}</p>
          <p className={styles.locationLine}>
            {profile.location}
            <span aria-hidden="true">·</span>
            <button onClick={() => onOpenDialog("contact")} type="button">
              Contact info
            </button>
          </p>
          <button
            className={styles.connectionsLink}
            onClick={() => onOpenDialog("resources")}
            type="button"
          >
            {profile.connectionCount} connections
          </button>
        </div>

        <div className={styles.affiliations}>
          {profile.affiliations.map((affiliation) => (
            <div className={styles.affiliation} key={affiliation.id}>
              <Image
                alt=""
                height={42}
                src={affiliation.logo}
                width={42}
              />
              <strong>{affiliation.name}</strong>
            </div>
          ))}
        </div>

        <div className={styles.heroActions}>
          <PrimaryButton onClick={() => onOpenDialog("open-to")}>
            Open to
          </PrimaryButton>
          <OutlineButton onClick={() => onOpenDialog("add-section")}>
            Add section
          </OutlineButton>
          <OutlineButton onClick={() => onOpenDialog("resources")}>
            Add custom button
          </OutlineButton>
          <OutlineButton dark onClick={() => onOpenDialog("resources")}>
            Resources
          </OutlineButton>
        </div>
      </div>
    </section>
  );
}

function SuggestedCard() {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <SectionHeading
        subtitle="Private to you"
        title="Suggested for you"
      />
      <div className={styles.suggestionContent}>
        <div className={styles.suggestionIcon} aria-hidden="true">
          <SparkleIcon />
        </div>
        <div>
          <h3>Enhance your profile</h3>
          <p>
            Stand out for almost 2x as many opportunities with the help of AI
            and much more.
          </p>
          <Link className={styles.darkOutlineLink} href="/career-tree">
            Enhance with AI
          </Link>
        </div>
      </div>
    </section>
  );
}

function AnalyticsCard({ profile }: { profile: CurrentProfile }) {
  const analytics = [
    {
      label: `${profile.analytics.profileViews} profile views`,
      detail: "Discover who's viewed your profile.",
      icon: <PeopleIcon />,
    },
    {
      label: `${profile.analytics.postImpressions} post impressions`,
      detail: "Start a post to increase engagement.",
      extra: profile.analytics.period,
      icon: <ChartIcon />,
    },
    {
      label: `${profile.analytics.searchAppearances} search appearances`,
      detail: "See how often you appear in search results.",
      icon: <SearchPersonIcon />,
    },
  ];

  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <SectionHeading subtitle="Private to you" title="Analytics" />
      <div className={styles.analyticsGrid}>
        {analytics.map((item) => (
          <button className={styles.analyticsItem} key={item.label} type="button">
            <span className={styles.analyticsIcon}>{item.icon}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
              {item.extra ? <em>{item.extra}</em> : null}
            </span>
          </button>
        ))}
      </div>
      <ShowAllButton label="Show all analytics" />
    </section>
  );
}

function ResourcesCard({
  onOpenDialog,
}: {
  onOpenDialog: (dialog: DialogKind) => void;
}) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <SectionHeading title="Resources" />
      <button
        className={styles.resourceRow}
        onClick={() => onOpenDialog("resources")}
        type="button"
      >
        <span className={styles.resourceIcon}>
          <HeartHandsIcon />
        </span>
        <span>
          <strong>
            Tell non-profits you are interested in getting involved with your
            time and skills
          </strong>
          <small>Get started</small>
        </span>
      </button>
    </section>
  );
}

function ActivityCard({ profile }: { profile: CurrentProfile }) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <div className={styles.headingWithAction}>
        <SectionHeading
          subtitle={`${profile.followerCount} followers`}
          title="Activity"
        />
        <OutlineButton>Create a post</OutlineButton>
      </div>
      <div className={styles.activityList}>
        {profile.activity.map((activity) => (
          <article className={styles.activityItem} key={activity.id}>
            <Image
              alt=""
              className={styles.activityAvatar}
              height={56}
              src={profile.profilePhoto}
              width={56}
            />
            <div>
              <p>
                <strong>{profile.name}</strong> commented on a post
              </p>
              <small>• {activity.age}</small>
              <p className={styles.activityText}>{activity.text}</p>
            </div>
          </article>
        ))}
      </div>
      <ShowAllButton label="Show all comments" />
    </section>
  );
}

function ExperienceCard({
  experiences,
  onEdit,
  onShowAll,
}: {
  experiences: ProfileExperience[];
  onEdit: () => void;
  onShowAll: () => void;
}) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <EditableSectionHeading onEdit={onEdit} title="Experience" />
      <div className={styles.timelineList}>
        {experiences.map((experience) => (
          <ExperienceItem experience={experience} key={experience.id} />
        ))}
      </div>
      <ShowAllButton
        label="Show all experiences"
        onClick={onShowAll}
      />
    </section>
  );
}

function ExperienceItem({
  experience,
  compact = false,
}: {
  experience: ProfileExperience;
  compact?: boolean;
}) {
  return (
    <article className={styles.timelineItem} data-compact={compact}>
      <Image
        alt=""
        className={styles.organizationLogo}
        height={64}
        src={experience.logo}
        width={64}
      />
      <div>
        <h3>{experience.title}</h3>
        <p>
          {experience.company}
          {experience.employmentType
            ? ` · ${experience.employmentType}`
            : ""}
        </p>
        <small>
          {experience.startDate} - {experience.endDate} · {experience.duration}
        </small>
        {experience.location ? <small>{experience.location}</small> : null}
        {experience.description.map((line) => (
          <p className={styles.timelineDescription} key={line}>
            {line}
          </p>
        ))}
      </div>
    </article>
  );
}

function EducationCard({
  education,
  onEdit,
}: {
  education: ProfileEducation[];
  onEdit: () => void;
}) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <EditableSectionHeading onEdit={onEdit} title="Education" />
      <div className={styles.timelineList}>
        {education.map((entry) => (
          <EducationItem education={entry} key={entry.id} />
        ))}
      </div>
    </section>
  );
}

function EducationItem({
  education,
}: {
  education: ProfileEducation;
}) {
  return (
    <article className={styles.timelineItem}>
      <Image
        alt=""
        className={styles.organizationLogo}
        height={64}
        src={education.logo}
        width={64}
      />
      <div>
        <h3>{education.school}</h3>
        {education.degree ? <p>{education.degree}</p> : null}
        {education.dates ? <small>{education.dates}</small> : null}
        {education.description.map((line) => (
          <p className={styles.timelineDescription} key={line}>
            {line}
          </p>
        ))}
      </div>
    </article>
  );
}

function ConnectedAppsCard({
  apps,
  onAction,
}: {
  apps: CurrentProfile["connectedApps"];
  onAction: (message: string) => void;
}) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <SectionHeading
        subtitle="Add the products you use to stand out and get more profile views."
        title="Connected apps"
      />
      <div className={styles.appsGrid}>
        {apps.map((app) => (
          <div className={styles.appItem} key={app.id}>
            <span data-app={app.id}>{app.mark}</span>
            <strong>{app.name}</strong>
          </div>
        ))}
      </div>
      <button
        className={styles.addAppsButton}
        onClick={() => onAction("Connected-app management scaffold opened.")}
        type="button"
      >
        Add connected apps
      </button>
    </section>
  );
}

function SkillsCard({
  onEdit,
  onShowAll,
  skillCount,
  skills,
}: {
  onEdit: () => void;
  onShowAll: () => void;
  skillCount: number;
  skills: ProfileSkill[];
}) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <EditableSectionHeading
        onEdit={onEdit}
        title={`Skills (${skillCount})`}
      />
      <div className={styles.skillList}>
        {skills.map((skill) => (
          <SkillItem key={skill.id} skill={skill} />
        ))}
      </div>
      <ShowAllButton label="Show all" onClick={onShowAll} />
    </section>
  );
}

function SkillItem({ skill }: { skill: ProfileSkill }) {
  return (
    <article className={styles.skillItem}>
      <h3>{skill.name}</h3>
      {skill.endorsementNotes.map((note, index) => (
        <p key={note}>
          {index === 0 ? (
            <Image
              alt=""
              height={28}
              src="/linkedin/jane-street.png"
              width={28}
            />
          ) : (
            <span className={styles.miniAvatar}>WI</span>
          )}
          {note}
        </p>
      ))}
      <p>
        <PeopleIcon />
        {skill.endorsementCount} endorsements
      </p>
    </article>
  );
}

function RecommendationsCard({ profile }: { profile: CurrentProfile }) {
  const [tab, setTab] = useState<"received" | "given">("received");
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <SectionHeading title="Recommendations" />
      <div className={styles.recommendationTabs} role="tablist">
        <button
          aria-selected={tab === "received"}
          onClick={() => setTab("received")}
          role="tab"
          type="button"
        >
          Received ({profile.recommendations.receivedCount})
        </button>
        <button
          aria-selected={tab === "given"}
          onClick={() => setTab("given")}
          role="tab"
          type="button"
        >
          Given
        </button>
      </div>
      <div className={styles.recommendationEmpty} role="tabpanel">
        {tab === "received"
          ? "All received recommendations are hidden"
          : "Recommendations you give will appear here"}
        <small>
          Recommendations visible to others will appear here
        </small>
      </div>
    </section>
  );
}

function HonorsCard({
  honorCount,
  honors,
  onEdit,
  onShowAll,
}: {
  honorCount: number;
  honors: ProfileHonor[];
  onEdit: () => void;
  onShowAll: () => void;
}) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <EditableSectionHeading
        onEdit={onEdit}
        title={`Honors & awards (${honorCount})`}
      />
      <div className={styles.honorList}>
        {honors.map((honor) => (
          <HonorItem honor={honor} key={honor.id} />
        ))}
      </div>
      <ShowAllButton
        label={`Show all ${honorCount} honors & awards`}
        onClick={onShowAll}
      />
    </section>
  );
}

function HonorItem({ honor }: { honor: ProfileHonor }) {
  return (
    <article className={styles.honorItem}>
      <h3>{honor.name}</h3>
      <p>
        Issued by {honor.issuer} · {honor.issued}
      </p>
    </article>
  );
}

function InterestsCard({
  activeTab,
  followedItems,
  items,
  onTabChange,
  onToggleFollow,
  profile,
}: {
  activeTab: string;
  followedItems: string[];
  items: CurrentProfile["interests"]["items"];
  onTabChange: (tab: string) => void;
  onToggleFollow: (id: string) => void;
  profile: CurrentProfile;
}) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <SectionHeading title="Interests" />
      <div className={styles.interestTabs} role="tablist">
        {profile.interests.tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab}
            key={tab}
            onClick={() => onTabChange(tab)}
            role="tab"
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      <div className={styles.interestItems} role="tabpanel">
        {items.length ? (
          items.map((item) => (
            <article className={styles.interestItem} key={item.id}>
              <InitialAvatar initials={initialsFor(item.name)} />
              <div>
                <h3>
                  {item.name}
                  {item.relationship ? (
                    <small> · {item.relationship}</small>
                  ) : null}
                </h3>
                <p>{item.headline}</p>
                {item.followers ? <small>{item.followers}</small> : null}
                <FollowButton
                  following={followedItems.includes(item.id)}
                  onClick={() => onToggleFollow(item.id)}
                />
              </div>
            </article>
          ))
        ) : (
          <p className={styles.tabEmpty}>
            No public {activeTab.toLowerCase()} entries were supplied.
          </p>
        )}
      </div>
    </section>
  );
}

function ProfileRightRail({
  connectedPeople,
  followedItems,
  onEdit,
  onToggleConnection,
  onToggleFollow,
  profile,
}: {
  connectedPeople: string[];
  followedItems: string[];
  onEdit: () => void;
  onToggleConnection: (id: string) => void;
  onToggleFollow: (id: string) => void;
  profile: CurrentProfile;
}) {
  return (
    <aside className={styles.rightRail}>
      <section className={`${styles.card} ${styles.settingsCard}`}>
        <div>
          <button
            aria-label="Edit profile language"
            onClick={onEdit}
            type="button"
          >
            <PencilIcon />
          </button>
          <h2>Profile language</h2>
          <p>{profile.profileLanguage}</p>
        </div>
        <div>
          <button
            aria-label="Edit public profile URL"
            onClick={onEdit}
            type="button"
          >
            <PencilIcon />
          </button>
          <h2>Public profile & URL</h2>
          <p className={styles.publicUrl}>{profile.publicUrl}</p>
        </div>
      </section>

      <PeopleCard
        connectedPeople={connectedPeople}
        onToggleConnection={onToggleConnection}
        people={profile.viewerSuggestions}
        premium
        subtitle="Private to you"
        title="Who your viewers also viewed"
      />

      <PeopleCard
        connectedPeople={connectedPeople}
        onToggleConnection={onToggleConnection}
        people={profile.peopleYouMayKnow}
        subtitle="From your school"
        title="People you may know"
      />

      <section className={`${styles.card} ${styles.railCard}`}>
        <SectionHeading title="You might like" subtitle="Pages for you" />
        <div className={styles.railList}>
          {profile.suggestedPages.map((page) => (
            <article className={styles.railPerson} key={page.id}>
              <InitialAvatar initials={page.initials} square />
              <div>
                <h3>{page.name}</h3>
                <p>{page.industry}</p>
                <small>{page.followers}</small>
                <small>{page.context}</small>
                <FollowButton
                  following={followedItems.includes(page.id)}
                  onClick={() => onToggleFollow(page.id)}
                />
              </div>
            </article>
          ))}
        </div>
        <ShowAllButton label="Show all" />
      </section>

      <ProfileFooter />
    </aside>
  );
}

function PeopleCard({
  connectedPeople,
  onToggleConnection,
  people,
  premium = false,
  subtitle,
  title,
}: {
  connectedPeople: string[];
  onToggleConnection: (id: string) => void;
  people: ProfilePerson[];
  premium?: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <section className={`${styles.card} ${styles.railCard}`}>
      {premium ? (
        <span className={styles.premiumLabel}>
          <i />
          Premium
        </span>
      ) : null}
      <SectionHeading subtitle={subtitle} title={title} />
      <div className={styles.railList}>
        {people.slice(0, premium ? 3 : 5).map((person) => (
          <article className={styles.railPerson} key={person.id}>
            <InitialAvatar initials={person.initials} />
            <div>
              <h3>
                {person.name}
                <small> · {person.relationship}</small>
              </h3>
              <p>{person.headline}</p>
              <ConnectButton
                connected={connectedPeople.includes(person.id)}
                onClick={() => onToggleConnection(person.id)}
              />
            </div>
          </article>
        ))}
      </div>
      <ShowAllButton label="Show all" />
    </section>
  );
}

function ProfileFooter() {
  const links = [
    "About",
    "Accessibility",
    "Talent Solutions",
    "Community Guidelines",
    "Careers",
    "Marketing Solutions",
    "Privacy & Terms",
    "Ad Choices",
    "Advertising",
    "Sales Solutions",
    "Mobile",
    "Small Business",
    "Safety Center",
  ];
  return (
    <footer className={styles.profileFooter}>
      <nav aria-label="LinkedIn footer">
        {links.map((link) => (
          <button key={link} type="button">
            {link}
          </button>
        ))}
      </nav>
      <div className={styles.footerHelp}>
        <strong>Questions?</strong>
        <span>Visit our Help Center.</span>
        <strong>Manage your account and privacy</strong>
        <span>Go to your Settings.</span>
        <strong>Recommendation transparency</strong>
        <span>Learn more about Recommended Content.</span>
      </div>
      <label>
        Select language
        <select defaultValue="English">
          <option>English</option>
        </select>
      </label>
      <p>
        <strong>Linked</strong>
        <span>in</span> Corporation © 2026
      </p>
    </footer>
  );
}

function ProfileDialog({
  dialog,
  onClose,
  onSaveProfile,
  onScaffoldAction,
  profile,
}: {
  dialog: DialogKind;
  onClose: () => void;
  onSaveProfile: (patch: CurrentProfilePatch) => Promise<void>;
  onScaffoldAction: (message: string) => void;
  profile: CurrentProfile;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialog) {
      return;
    }
    closeButton.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialog, onClose]);

  if (!dialog) {
    return null;
  }

  const titles: Record<Exclude<DialogKind, null>, string> = {
    "add-section": "Add to profile",
    contact: "Contact info",
    edit: "Edit profile and Path[IN] data",
    experience: "Experience",
    honors: "Honors & awards",
    "open-to": "Open to",
    resources: "Resources",
    skills: "Skills",
  };

  return (
    <div
      className={styles.dialogBackdrop}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="profile-dialog-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <header>
          <h2 id="profile-dialog-title">{titles[dialog]}</h2>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            ref={closeButton}
            type="button"
          >
            <Icon name="close" />
          </button>
        </header>

        {dialog === "edit" ? (
          <EditProfileForm onSave={onSaveProfile} profile={profile} />
        ) : null}

        {dialog === "contact" ? (
          <div className={styles.dialogContent}>
            <ContactRow label="Profile" value={profile.publicUrl} />
            <ContactRow label="Location" value={profile.location} />
            <p className={styles.privacyCopy}>
              Path[IN] only uses fields you enable. It does not request
              LinkedIn credentials or scrape this public URL.
            </p>
          </div>
        ) : null}

        {dialog === "experience" ? (
          <div className={styles.dialogList}>
            {profile.experience.map((experience) => (
              <ExperienceItem
                compact
                experience={experience}
                key={experience.id}
              />
            ))}
          </div>
        ) : null}

        {dialog === "skills" ? (
          <div className={styles.dialogList}>
            {profile.skills.map((skill) => (
              <SkillItem key={skill.id} skill={skill} />
            ))}
            <p className={styles.integrityNote}>
              The profile reports {profile.skillCount} skills, but only{" "}
              {profile.skills.length} names were supplied. Path[IN] does not
              invent the remaining skill names.
            </p>
          </div>
        ) : null}

        {dialog === "honors" ? (
          <div className={styles.dialogList}>
            {profile.honors.map((honor) => (
              <HonorItem honor={honor} key={honor.id} />
            ))}
            <p className={styles.integrityNote}>
              The profile reports {profile.honorCount} honors, but only{" "}
              {profile.honors.length} were supplied. Unsupplied awards are not
              fabricated.
            </p>
          </div>
        ) : null}

        {dialog === "add-section" ? (
          <DialogMenu
            items={[
              "Add about",
              "Add position",
              "Add education",
              "Add skills",
              "Add projects",
              "Add honors & awards",
            ]}
            onAction={(item) =>
              onScaffoldAction(`${item} scaffold is ready for profile data.`)
            }
          />
        ) : null}

        {dialog === "resources" ? (
          <div className={styles.dialogContent}>
            <Link className={styles.pathinResource} href="/career-tree">
              <span>in</span>
              <div>
                <strong>Explore Path[IN]</strong>
                <small>
                  Generate personalized career paths from your enabled profile
                  evidence and resume.
                </small>
              </div>
              <Icon name="chevron-right" />
            </Link>
            <DialogMenu
              items={[
                "Volunteer interests",
                "Creator mode",
                "Saved items",
                "Activity visibility",
              ]}
              onAction={(item) =>
                onScaffoldAction(`${item} scaffold opened.`)
              }
            />
          </div>
        ) : null}

        {dialog === "open-to" ? (
          <DialogMenu
            items={[
              "Finding a new job",
              "Hiring",
              "Providing services",
              "Finding volunteer opportunities",
            ]}
            onAction={(item) =>
              onScaffoldAction(`Open-to preference selected: ${item}.`)
            }
          />
        ) : null}
      </section>
    </div>
  );
}

function EditProfileForm({
  onSave,
  profile,
}: {
  onSave: (patch: CurrentProfilePatch) => Promise<void>;
  profile: CurrentProfile;
}) {
  const [name, setName] = useState(profile.name);
  const [headline, setHeadline] = useState(profile.headline);
  const [location, setLocation] = useState(profile.location);
  const [publicUrl, setPublicUrl] = useState(profile.publicUrl);
  const [profileLanguage, setProfileLanguage] = useState(
    profile.profileLanguage,
  );
  const [enabledCategories, setEnabledCategories] = useState(
    profile.enabledCategories,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        enabledCategories,
        headline,
        location,
        name,
        profileLanguage,
        publicUrl,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Path[IN] could not save this profile.",
      );
      setSaving(false);
    }
  }

  return (
    <form className={styles.editForm} onSubmit={submit}>
      <div className={styles.editFields}>
        <label>
          Name
          <input
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label>
          Headline
          <textarea
            maxLength={500}
            onChange={(event) => setHeadline(event.target.value)}
            rows={3}
            value={headline}
          />
        </label>
        <label>
          Location
          <input
            maxLength={200}
            onChange={(event) => setLocation(event.target.value)}
            value={location}
          />
        </label>
        <label>
          Public profile URL
          <input
            maxLength={500}
            onChange={(event) => setPublicUrl(event.target.value)}
            value={publicUrl}
          />
        </label>
        <label>
          Profile language
          <select
            onChange={(event) => setProfileLanguage(event.target.value)}
            value={profileLanguage}
          >
            <option>English</option>
          </select>
        </label>
      </div>

      <fieldset className={styles.categoryControls}>
        <legend>Information Path[IN] may analyze</legend>
        <p>
          Disabling a profile category removes only this connected-profile
          evidence. Information in a separately uploaded resume remains under
          its own controls.
        </p>
        <div>
          {Object.entries(categoryLabels).map(([category, label]) => (
            <label key={category}>
              <input
                checked={
                  enabledCategories[category as ProfileCategory] ?? true
                }
                onChange={(event) =>
                  setEnabledCategories((current) => ({
                    ...current,
                    [category]: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      <footer className={styles.formActions}>
        <button disabled={saving} type="submit">
          {saving ? "Saving..." : "Save"}
        </button>
      </footer>
    </form>
  );
}

function DialogMenu({
  items,
  onAction,
}: {
  items: string[];
  onAction: (item: string) => void;
}) {
  return (
    <div className={styles.dialogMenu}>
      {items.map((item) => (
        <button key={item} onClick={() => onAction(item)} type="button">
          <span>{item}</span>
          <Icon name="chevron-right" />
        </button>
      ))}
    </div>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.contactRow}>
      <GlobeLinkIcon />
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}

function SectionHeading({
  subtitle,
  title,
}: {
  subtitle?: string;
  title: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

function EditableSectionHeading({
  onEdit,
  title,
}: {
  onEdit: () => void;
  title: string;
}) {
  return (
    <div className={styles.editableHeading}>
      <h2>{title}</h2>
      <div>
        <button aria-label={`Add ${title}`} type="button">
          <Icon name="plus" />
        </button>
        <button aria-label={`Edit ${title}`} onClick={onEdit} type="button">
          <PencilIcon />
        </button>
      </div>
    </div>
  );
}

function ShowAllButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button className={styles.showAllButton} onClick={onClick} type="button">
      {label}
      <span aria-hidden="true">→</span>
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className={styles.primaryButton} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function OutlineButton({
  children,
  dark = false,
  onClick,
}: {
  children: ReactNode;
  dark?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={styles.outlineButton}
      data-dark={dark ? "true" : "false"}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
  transparent = false,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  transparent?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={styles.iconButton}
      data-transparent={transparent ? "true" : "false"}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ConnectButton({
  connected,
  onClick,
}: {
  connected: boolean;
  onClick: () => void;
}) {
  return (
    <button className={styles.connectButton} onClick={onClick} type="button">
      <PeoplePlusIcon />
      {connected ? "Pending" : "Connect"}
    </button>
  );
}

function FollowButton({
  following,
  onClick,
}: {
  following: boolean;
  onClick: () => void;
}) {
  return (
    <button className={styles.followButton} onClick={onClick} type="button">
      {following ? "✓ Following" : "+ Follow"}
    </button>
  );
}

function InitialAvatar({
  initials,
  square = false,
}: {
  initials: string;
  square?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={styles.initialAvatar}
      data-square={square ? "true" : "false"}
    >
      {initials}
    </span>
  );
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m4 20 4.3-1 11-11a2 2 0 0 0 0-2.8l-.5-.5a2 2 0 0 0-2.8 0l-11 11L4 20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path d="m14.8 5.8 3.4 3.4" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

function VerificationIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m12 2 8 3v6c0 5.2-3.4 9-8 11-4.6-2-8-5.8-8-11V5l8-3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m8.4 12 2.2 2.2 4.8-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 2c.7 5.1 3 7.3 8 8-5 .7-7.3 3-8 8-.7-5-3-7.3-8-8 5-.7 7.3-2.9 8-8Z"
        fill="currentColor"
      />
      <path d="M19 16c.3 2 1.2 2.9 3 3-1.8.3-2.7 1.2-3 3-.2-1.8-1.1-2.7-3-3 1.9-.1 2.8-1 3-3Z" fill="currentColor" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="8" cy="7" r="4" />
      <circle cx="17.5" cy="8.5" r="3" />
      <path d="M1 22v-5.5C1 13.5 3.4 11 6.5 11h3c3 0 5.5 2.5 5.5 5.5V22H1Zm15.5 0v-5.1c0-1.7-.5-3.2-1.4-4.4.7-.4 1.5-.5 2.4-.5 3 0 5.5 2.5 5.5 5.5V22h-6.5Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M4 20V9m8 11V4m8 16v-7" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function SearchPersonIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="4" fill="currentColor" />
      <path d="M2 20v-3c0-3 2.5-5.5 5.5-5.5h3c2 0 3.8 1 4.8 2.5" fill="currentColor" />
      <circle cx="17" cy="16" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="m20 19 2 2" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function HeartHandsIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 19s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 4.7-7 9-7 9Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PeoplePlusIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="8" cy="7" r="4" />
      <path d="M1 22v-5.2C1 13.6 3.6 11 6.8 11h2.4c3.2 0 5.8 2.6 5.8 5.8V22H1Z" />
      <path d="M19 7v6M16 10h6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

function GlobeLinkIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
