"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
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
  ProfileSkill,
} from "./types";

type DialogKind =
  | "contact"
  | "edit"
  | "experience"
  | "honors"
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
  certifications: "Certifications",
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

  async function saveProfile(patch: CurrentProfilePatch) {
    const updated = await updateCurrentProfile(patch);
    setProfile(updated);
    setDialog(null);
    showToast("Profile changes saved and available to PathIn.");
  }

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

            <SuggestedCard
              onAction={() => setDialog("edit")}
            />

            <ExperienceCard
              experiences={profile.experience}
              onEdit={() => setDialog("edit")}
              onShowAll={() => setDialog("experience")}
            />

            <EducationCard
              education={profile.education}
              onEdit={() => setDialog("edit")}
            />

            <SkillsCard
              onEdit={() => setDialog("edit")}
              onShowAll={() => setDialog("skills")}
              skills={profile.skills}
            />

            <HonorsCard
              honors={profile.honors}
              onEdit={() => setDialog("edit")}
              onShowAll={() => setDialog("honors")}
            />

          </div>

          <ProfileRightRail
            onEdit={() => setDialog("edit")}
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
          <OutlineButton onClick={() => onOpenDialog("edit")}>
            Manage PathIn data
          </OutlineButton>
          <Link className={styles.primaryButton} href="/career-tree">
            Explore paths
          </Link>
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
      />

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
          <p className={styles.headline}>{profile.headline}</p>
          <p className={styles.locationLine}>
            {profile.location}
            <span aria-hidden="true">·</span>
            <button onClick={() => onOpenDialog("contact")} type="button">
              Contact info
            </button>
          </p>
          <span className={styles.connectionsLink}>
            {profile.connectionCount} connections
          </span>
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
          <Link className={styles.primaryButton} href="/career-tree">
            Explore career paths
          </Link>
          <OutlineButton dark onClick={() => onOpenDialog("edit")}>
            Manage PathIn data
          </OutlineButton>
        </div>
      </div>
    </section>
  );
}

function SuggestedCard({ onAction }: { onAction: () => void }) {
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
          <h3>Control your PathIn evidence</h3>
          <p>
            Choose which professional categories PathIn may analyze. Disabled
            categories are removed before recommendation scoring.
          </p>
          <button
            className={styles.darkOutlineLink}
            onClick={onAction}
            type="button"
          >
            Review data controls
          </button>
        </div>
      </div>
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
        {experience.description.map((line, index) => (
          <p className={styles.timelineDescription} key={index}>
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

function SkillsCard({
  onEdit,
  onShowAll,
  skills,
}: {
  onEdit: () => void;
  onShowAll: () => void;
  skills: ProfileSkill[];
}) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <EditableSectionHeading
        onEdit={onEdit}
        title={`Skills (${skills.length})`}
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
      <p>Available to recommendation scoring when the Skills category is enabled.</p>
    </article>
  );
}

function HonorsCard({
  honors,
  onEdit,
  onShowAll,
}: {
  honors: ProfileHonor[];
  onEdit: () => void;
  onShowAll: () => void;
}) {
  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <EditableSectionHeading
        onEdit={onEdit}
        title={`Honors & awards (${honors.length})`}
      />
      <div className={styles.honorList}>
        {honors.map((honor) => (
          <HonorItem honor={honor} key={honor.id} />
        ))}
      </div>
      <ShowAllButton
        label={`Show all ${honors.length} honors & awards`}
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

function ProfileRightRail({
  onEdit,
  profile,
}: {
  onEdit: () => void;
  profile: CurrentProfile;
}) {
  const enabledCategoryCount = Object.values(
    profile.pathinEvidence.enabledCategories,
  ).filter(Boolean).length;
  const enabledEvidenceCount = Object.entries(
    profile.pathinEvidence.fields,
  ).reduce(
    (count, [category, fields]) =>
      profile.pathinEvidence.enabledCategories[
        category as ProfileCategory
      ]
        ? count + fields.length
        : count,
    0,
  );

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

      <section className={`${styles.card} ${styles.railCard}`}>
        <SectionHeading
          subtitle="User-authorized profile source"
          title="PathIn evidence controls"
        />
        <div className={styles.dialogContent}>
          <p>
            <strong>{enabledEvidenceCount} profile signals</strong> across{" "}
            <strong>{enabledCategoryCount} enabled categories</strong> are
            available to PathIn.
          </p>
          <p className={styles.privacyCopy}>
            Analytics, activity, recommendations, connections, suggested
            people, and connected apps are excluded.
          </p>
        </div>
        <ShowAllButton label="Review PathIn data controls" onClick={onEdit} />
        <Link className={styles.showAllButton} href="/career-tree">
          Generate career paths
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <ProfileFooter />
    </aside>
  );
}

function ProfileFooter() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/career-tree", label: "PathIn career explorer" },
    { href: "/in/winstoniskandar", label: "Profile data controls" },
  ];
  return (
    <footer className={styles.profileFooter}>
      <nav aria-label="Product navigation">
        {links.map((link) => (
          <Link className={styles.footerLink} href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className={styles.footerHelp}>
        <strong>Profile boundary</strong>
        <span>
          This is a user-authorized LinkedIn-style profile copy. No LinkedIn
          credentials or scraping are used.
        </span>
      </div>
      <p>Language: English</p>
      <p>PathIn · Explainable career exploration</p>
    </footer>
  );
}

function ProfileDialog({
  dialog,
  onClose,
  onSaveProfile,
  profile,
}: {
  dialog: DialogKind;
  onClose: () => void;
  onSaveProfile: (patch: CurrentProfilePatch) => Promise<void>;
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
    contact: "Contact info",
    edit: "Edit profile and PathIn data",
    experience: "Experience",
    honors: "Honors & awards",
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
              PathIn only uses fields you enable. It does not request
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
              {profile.skills.length} names were supplied. PathIn does not
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
          : "PathIn could not save this profile.",
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
        <legend>Information PathIn may analyze</legend>
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
        <button
          aria-label={`Manage PathIn use of ${title}`}
          onClick={onEdit}
          type="button"
        >
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
  onClick: () => void;
}) {
  return (
    <button className={styles.showAllButton} onClick={onClick} type="button">
      {label}
      <span aria-hidden="true">→</span>
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
  onClick: () => void;
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

function GlobeLinkIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
