import type {
  CareerEdge,
  CareerMapData,
  CareerNode,
  PitCourse,
  PitDataset,
  PitJob,
} from "./types";

const PIT_URL = "https://pit.najera.cc/";
const PRIVACY_THRESHOLD = 20;

type RoleStats = {
  postingCount: number;
  averageSalaryFrom: number;
  averageSalaryTo: number;
  locations: string[];
};

type AggregateFacts = {
  memberCount: number;
  jobCount: number;
  courseCount: number;
  cohortCount: number;
  transitionCounts: Record<string, number>;
  roleStats: Record<string, RoleStats>;
  courses: Record<string, PitCourse>;
};

const SNAPSHOT_FACTS: AggregateFacts = {
  memberCount: 2000,
  jobCount: 1000,
  courseCount: 600,
  cohortCount: 435,
  transitionCounts: {
    "Data Scientist (Entry) -> Data Scientist (Mid)": 0,
    "DevOps Engineer (Entry) -> DevOps Engineer (Mid)": 5,
    "DevOps Engineer (Mid) -> Data Scientist (Senior)": 4,
    "DevOps Engineer (Mid) -> DevOps Engineer (Senior)": 4,
    "Product Manager (Entry) -> Product Manager (Mid)": 1,
    "Software Engineer (Entry) -> DevOps Engineer (Mid)": 4,
    "UX Designer (Entry) -> UX Designer (Mid)": 4,
  },
  roleStats: {
    "Data Scientist": {
      postingCount: 18,
      averageSalaryFrom: 89845,
      averageSalaryTo: 170239,
      locations: [
        "Seattle, WA",
        "Austin, TX",
        "New York, NY",
        "San Francisco, CA",
        "Boston, MA",
      ],
    },
    "DevOps Engineer": {
      postingCount: 24,
      averageSalaryFrom: 96862,
      averageSalaryTo: 168359,
      locations: [
        "San Francisco, CA",
        "Seattle, WA",
        "Boston, MA",
        "Austin, TX",
        "New York, NY",
      ],
    },
    "Product Manager": {
      postingCount: 21,
      averageSalaryFrom: 106939,
      averageSalaryTo: 180669,
      locations: [
        "Seattle, WA",
        "Boston, MA",
        "Austin, TX",
        "San Francisco, CA",
        "New York, NY",
      ],
    },
    "Software Engineer": {
      postingCount: 15,
      averageSalaryFrom: 89649,
      averageSalaryTo: 165508,
      locations: [
        "Austin, TX",
        "Boston, MA",
        "New York, NY",
        "Seattle, WA",
        "San Francisco, CA",
      ],
    },
    "UX Designer": {
      postingCount: 20,
      averageSalaryFrom: 93293,
      averageSalaryTo: 178390,
      locations: [
        "Austin, TX",
        "Boston, MA",
        "New York, NY",
        "Seattle, WA",
        "San Francisco, CA",
      ],
    },
  },
  courses: {
    "Cloud Computing with AWS": {
      id: "course_3546",
      name: "Cloud Computing with AWS",
      category: "Technology",
      skills: ["AWS", "DevOps", "Blockchain"],
      length: { value: 3, unit: "hours" },
      level: "Easy",
    },
    "Machine Learning Fundamentals": {
      id: "course_1476",
      name: "Machine Learning Fundamentals",
      category: "Artificial Intelligence",
      skills: ["Machine Learning", "Python", "Data Analysis"],
      length: { value: 5, unit: "hours" },
      level: "Easy",
    },
    "Project Management Basics": {
      id: "course_2852",
      name: "Project Management Basics",
      category: "Project Management",
      skills: ["Project Planning", "Agile", "Scrum"],
      length: { value: 6, unit: "hours" },
      level: "Easy",
    },
    "UX/UI Design": {
      id: "course_6335",
      name: "UX/UI Design",
      category: "Design",
      skills: ["Graphic Design", "Photoshop", "UX/UI"],
      length: { value: 8, unit: "hours" },
      level: "Medium",
    },
  },
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function roleStats(jobs: PitJob[], role: string): RoleStats {
  const matchingJobs = jobs.filter(
    (job) => job.position === role && job.industry === "Technology",
  );

  if (matchingJobs.length === 0) {
    return SNAPSHOT_FACTS.roleStats[role];
  }

  return {
    postingCount: matchingJobs.length,
    averageSalaryFrom: average(
      matchingJobs.map((job) => Number(job.salary_range.from)),
    ),
    averageSalaryTo: average(
      matchingJobs.map((job) => Number(job.salary_range.to)),
    ),
    locations: Array.from(new Set(matchingJobs.map((job) => job.location))),
  };
}

function transitionKey(source: PitJob, target: PitJob) {
  return `${source.position} (${source.level}) -> ${target.position} (${target.level})`;
}

function aggregateDataset(dataset: PitDataset): AggregateFacts {
  const jobById = new Map(dataset.jobs.map((job) => [job.id, job]));
  const cohort = dataset.members.filter((member) =>
    member.school_history.some((school) =>
      /computer science|software engineering|information technology/i.test(
        school.degree,
      ),
    ),
  );
  const transitionCounts: Record<string, number> = {};

  for (const member of cohort) {
    const history = member.job_history
      .map((jobId) => jobById.get(jobId))
      .filter((job): job is PitJob => Boolean(job));

    for (let index = 0; index < history.length - 1; index += 1) {
      const key = transitionKey(history[index], history[index + 1]);
      transitionCounts[key] = (transitionCounts[key] ?? 0) + 1;
    }
  }

  const preferredCourses = [
    "Cloud Computing with AWS",
    "Machine Learning Fundamentals",
    "Project Management Basics",
    "UX/UI Design",
  ];
  const courses = Object.fromEntries(
    preferredCourses.map((name) => [
      name,
      dataset.courses.find(
        (course) => course.name === name && course.level === "Easy",
      ) ??
        dataset.courses.find((course) => course.name === name) ??
        SNAPSHOT_FACTS.courses[name],
    ]),
  );

  return {
    memberCount: dataset.members.length,
    jobCount: dataset.jobs.length,
    courseCount: dataset.courses.length,
    cohortCount: cohort.length,
    transitionCounts: {
      ...SNAPSHOT_FACTS.transitionCounts,
      ...transitionCounts,
    },
    roleStats: Object.fromEntries(
      [
        "Data Scientist",
        "DevOps Engineer",
        "Product Manager",
        "Software Engineer",
        "UX Designer",
      ].map((role) => [role, roleStats(dataset.jobs, role)]),
    ),
    courses,
  };
}

function courseNode(
  id: string,
  course: PitCourse,
  summary: string,
  whyItFits: string[],
): CareerNode {
  return {
    id,
    type: "course",
    label: course.name,
    eyebrow: `${course.level} course`,
    summary,
    stage: `${course.length.value} ${course.length.unit}`,
    workSetting: "Self-paced learning",
    whyItFits,
    responsibilities: [
      `Practice ${course.skills.join(", ")} through guided lessons.`,
      "Turn the material into a small portfolio-ready example.",
      "Use the course as preparation, not as a guaranteed credential.",
    ],
    existingSkills: ["Technical problem solving", "Independent learning"],
    transferableSkills: course.skills.slice(0, 2),
    skillsToBuild: course.skills,
    preview: `A short ${course.category.toLowerCase()} learning step that can strengthen the next transition in this route.`,
    challenges: [
      "Completing a course alone does not demonstrate applied experience.",
      "The strongest signal comes from pairing learning with a project or role.",
    ],
    sourceRecord: {
      id: course.id,
      kind: "course",
      label: "PIT course record",
    },
  };
}

function skillNode(
  id: string,
  label: string,
  summary: string,
  existingSkills: string[],
  transferableSkills: string[],
  skillsToBuild: string[],
): CareerNode {
  return {
    id,
    type: "skill",
    label,
    eyebrow: "Skill bridge",
    summary,
    stage: "Capability-building step",
    workSetting: "Applied through a project, course, club, or work sample",
    whyItFits: [
      `The current profile already supports ${existingSkills.join(" and ")}.`,
      "Making the skill explicit helps explain why the surrounding steps connect.",
    ],
    responsibilities: [
      `Practice ${skillsToBuild.join(", ")} in a realistic task.`,
      "Document what was attempted, learned, and improved.",
      "Use the result as evidence rather than treating a skill label as proof.",
    ],
    existingSkills,
    transferableSkills,
    skillsToBuild,
    preview:
      "A skill bridge is not a job title. It is a capability that can be built through several accessible types of experience.",
    challenges: [
      "Self-reported skill levels can be difficult to verify.",
      "The strongest evidence combines practice, feedback, and a visible output.",
    ],
    sourceRecord: {
      id: `prototype-${id}`,
      kind: "prototype",
      label: "Path[IN] role and skill taxonomy",
    },
  };
}

function roleNode({
  id,
  type,
  label,
  eyebrow,
  summary,
  stage,
  whyItFits,
  responsibilities,
  existingSkills,
  transferableSkills,
  skillsToBuild,
  preview,
  challenges,
  stats,
}: {
  id: string;
  type: CareerNode["type"];
  label: string;
  eyebrow: string;
  summary: string;
  stage: string;
  whyItFits: string[];
  responsibilities: string[];
  existingSkills: string[];
  transferableSkills: string[];
  skillsToBuild: string[];
  preview: string;
  challenges: string[];
  stats: RoleStats;
}): CareerNode {
  return {
    id,
    type,
    label,
    eyebrow,
    summary,
    stage,
    workSetting: "Cross-functional technology team",
    whyItFits,
    responsibilities,
    existingSkills,
    transferableSkills,
    skillsToBuild,
    preview,
    challenges,
    sourceRecord: {
      id: label,
      kind: "job",
      label: "Aggregated PIT technology postings",
    },
    market: stats,
  };
}

function observedEdge(
  id: string,
  source: string,
  target: string,
  transition: string,
  facts: AggregateFacts,
  explanation: string,
): CareerEdge {
  const count = facts.transitionCounts[transition] ?? 0;
  const privacySafe = count >= PRIVACY_THRESHOLD;

  return {
    id,
    source,
    target,
    type: privacySafe ? "observed_transition" : "recommended_transition",
    evidenceLevel: privacySafe ? "moderate" : "inferred",
    explanation,
    observedCount: privacySafe ? count : undefined,
    evidenceLabel:
      privacySafe
        ? `20+ matching sequences in the privacy-safe technical-education cohort`
        : "Exact transition evidence suppressed below the 20-profile privacy threshold; shown as a skill and role-taxonomy inference",
  };
}

function recommendedEdge(
  id: string,
  source: string,
  target: string,
  type: CareerEdge["type"],
  explanation: string,
): CareerEdge {
  return {
    id,
    source,
    target,
    type,
    evidenceLevel: type === "skill_bridge" ? "moderate" : "inferred",
    explanation,
    evidenceLabel:
      type === "skill_bridge"
        ? "Connected through overlapping skills in PIT course and role records"
        : "Prototype recommendation grounded in the selected profile signals",
  };
}

export function createCareerMap(
  dataset?: PitDataset,
  fetchedAt = "2026-06-23T21:42:04.000Z",
): CareerMapData {
  const facts = dataset ? aggregateDataset(dataset) : SNAPSHOT_FACTS;
  const cloudCourse = facts.courses["Cloud Computing with AWS"];
  const machineLearningCourse = facts.courses["Machine Learning Fundamentals"];
  const projectCourse = facts.courses["Project Management Basics"];
  const uxCourse = facts.courses["UX/UI Design"];

  const nodes: CareerNode[] = [
    {
      id: "current",
      type: "current",
      label: "Your current standing",
      eyebrow: "You are here",
      summary:
        "A technical student profile with software, quantitative, and early professional signals.",
      stage: "Student and early career",
      workSetting: "Stanford, Similate, and prior finance experience",
      whyItFits: [
        "Computer science and mathematics support several analytical and technical paths.",
        "Early company experience can translate into product, engineering, and research evidence.",
        "The profile is broad enough to explore more than one destination.",
      ],
      responsibilities: [
        "Build technical and quantitative foundations.",
        "Turn coursework and work into visible project evidence.",
        "Explore roles before committing to one destination.",
      ],
      existingSkills: [
        "Software problem solving",
        "Quantitative reasoning",
        "Technical communication",
      ],
      transferableSkills: [
        "Structured analysis",
        "Learning quickly",
        "Cross-functional collaboration",
      ],
      skillsToBuild: [
        "Applied machine learning",
        "Product discovery",
        "Portfolio storytelling",
      ],
      preview:
        "Path[IN] uses this editable profile snapshot as the starting point for each possible route.",
      challenges: [
        "The current profile does not yet declare one target career.",
        "Some recommendations rely on broad technical signals rather than a long job history.",
      ],
      sourceRecord: {
        id: "current-linkedin-profile",
        kind: "profile",
        label: "Current LinkedIn-style demo profile",
      },
    },
    courseNode(
      "course-cloud",
      cloudCourse,
      "Strengthen cloud and delivery skills before moving into an infrastructure-focused role.",
      [
        "Software experience makes an introductory cloud course immediately applicable.",
        "AWS and DevOps are common skills in the technical-education cohort.",
      ],
    ),
    courseNode(
      "course-ml",
      machineLearningCourse,
      "Build a concrete bridge from quantitative coursework to applied data work.",
      [
        "Mathematics and computer science are relevant foundations for Python and data analysis.",
        "The course can feed directly into a small applied project.",
      ],
    ),
    courseNode(
      "course-product",
      projectCourse,
      "Learn the language and workflow used to coordinate product work.",
      [
        "Technical experience can transfer into planning and cross-functional decision making.",
        "Agile and project planning make product responsibilities easier to preview.",
      ],
    ),
    courseNode(
      "course-ux",
      uxCourse,
      "Add user-centered design methods to an existing technical foundation.",
      [
        "Technical fluency can help a designer collaborate closely with engineering.",
        "A course becomes more useful when paired with a portfolio case study.",
      ],
    ),
    skillNode(
      "skill-data-analysis",
      "Applied data analysis",
      "Turn Python and quantitative reasoning into repeatable analysis, evaluation, and communication.",
      ["Programming", "Quantitative reasoning"],
      ["Structured analysis", "Evidence communication"],
      ["Data cleaning", "Model evaluation", "Data storytelling"],
    ),
    skillNode(
      "skill-product-discovery",
      "Product discovery",
      "Learn to identify a user problem, test assumptions, and make explicit priority tradeoffs.",
      ["Technical problem solving", "Communication"],
      ["Interviewing", "Decision making"],
      ["User research", "Prioritization", "Outcome framing"],
    ),
    skillNode(
      "skill-user-research",
      "User research",
      "Build the ability to ask useful questions, synthesize patterns, and connect evidence to design decisions.",
      ["Analytical thinking", "Communication"],
      ["Interviewing", "Synthesis"],
      ["Research planning", "Usability testing", "Insight communication"],
    ),
    {
      id: "data-project",
      type: "experience",
      label: "Applied data project",
      eyebrow: "Portfolio experience",
      summary:
        "Use a public dataset to frame a question, analyze evidence, and communicate a result.",
      stage: "Evidence-building step",
      workSetting: "Independent or student team",
      whyItFits: [
        "It converts mathematics and programming into a visible work sample.",
        "It creates a lower-barrier alternative to requiring an internship first.",
      ],
      responsibilities: [
        "Define a useful question and success criteria.",
        "Clean and analyze data in Python.",
        "Explain findings and limitations in a short case study.",
      ],
      existingSkills: ["Programming", "Quantitative reasoning"],
      transferableSkills: ["Research framing", "Evidence communication"],
      skillsToBuild: ["Data cleaning", "Model evaluation", "Data storytelling"],
      preview:
        "A strong project shows the full reasoning process, not only a polished chart or model.",
      challenges: [
        "Self-directed projects need a clear scope.",
        "The work should document uncertainty instead of overstating results.",
      ],
      sourceRecord: {
        id: "prototype-data-project",
        kind: "prototype",
        label: "Path[IN] evidence-building recommendation",
      },
    },
    {
      id: "product-project",
      type: "experience",
      label: "Product discovery sprint",
      eyebrow: "Cross-functional project",
      summary:
        "Identify a student problem, interview users, prioritize needs, and ship a small prototype.",
      stage: "Evidence-building step",
      workSetting: "Student or startup team",
      whyItFits: [
        "It adds customer discovery and prioritization to technical execution.",
        "It creates product evidence without requiring the Product Manager title first.",
      ],
      responsibilities: [
        "Interview potential users.",
        "Define a focused problem and measurable outcome.",
        "Coordinate a prototype and summarize tradeoffs.",
      ],
      existingSkills: ["Technical execution", "Problem solving"],
      transferableSkills: ["Communication", "Decision making"],
      skillsToBuild: ["User research", "Prioritization", "Roadmapping"],
      preview:
        "The project simulates a small product cycle from problem discovery through a testable release.",
      challenges: [
        "Product work is ambiguous and requires saying no to reasonable ideas.",
        "A prototype should be evaluated with users rather than treated as proof of demand.",
      ],
      sourceRecord: {
        id: "prototype-product-sprint",
        kind: "prototype",
        label: "Path[IN] evidence-building recommendation",
      },
    },
    {
      id: "ux-project",
      type: "experience",
      label: "UX portfolio case study",
      eyebrow: "Portfolio experience",
      summary:
        "Research and redesign one focused user journey, then document the reasoning behind it.",
      stage: "Evidence-building step",
      workSetting: "Independent or student team",
      whyItFits: [
        "It combines technical context with user-centered design.",
        "It provides visible evidence before a first design role.",
      ],
      responsibilities: [
        "Map a user journey and identify friction.",
        "Create and test low-fidelity concepts.",
        "Document decisions, feedback, and revisions.",
      ],
      existingSkills: ["Technical literacy", "Analytical thinking"],
      transferableSkills: ["Iteration", "Clear communication"],
      skillsToBuild: ["User research", "Interaction design", "Portfolio narrative"],
      preview:
        "The strongest case study explains the problem, alternatives, feedback, and what changed.",
      challenges: [
        "Visual polish cannot replace evidence about user needs.",
        "The case study must separate assumptions from observed findings.",
      ],
      sourceRecord: {
        id: "prototype-ux-case-study",
        kind: "prototype",
        label: "Path[IN] evidence-building recommendation",
      },
    },
    {
      id: "technical-lead-project",
      type: "experience",
      label: "Cross-functional feature lead",
      eyebrow: "Alternative experience",
      summary:
        "Lead a small feature from technical planning through stakeholder feedback.",
      stage: "Adjacent-role bridge",
      workSetting: "Startup, club, or project team",
      whyItFits: [
        "It keeps a technical route while adding product ownership.",
        "It demonstrates coordination without requiring a formal management title.",
      ],
      responsibilities: [
        "Clarify the user and business goal.",
        "Coordinate implementation decisions.",
        "Gather feedback and recommend the next iteration.",
      ],
      existingSkills: ["Software execution", "Technical communication"],
      transferableSkills: ["Ownership", "Stakeholder alignment"],
      skillsToBuild: ["Scope management", "Product judgment", "Facilitation"],
      preview:
        "This path lets a technically oriented student test product work while remaining close to engineering.",
      challenges: [
        "Ownership requires balancing quality, time, and user value.",
        "The role can become delivery-only unless discovery is included.",
      ],
      sourceRecord: {
        id: "prototype-feature-lead",
        kind: "prototype",
        label: "Path[IN] adjacent-role recommendation",
      },
    },
    roleNode({
      id: "software-entry",
      type: "entry_role",
      label: "Software Engineer",
      eyebrow: "Entry role",
      summary:
        "Build and maintain software while developing production-quality engineering habits.",
      stage: "Early professional role",
      whyItFits: [
        "Computer science is directly relevant to the role.",
        "Software work can open later routes into infrastructure, data, design, or product.",
      ],
      responsibilities: [
        "Implement and review production code.",
        "Debug systems and improve reliability.",
        "Collaborate with product, design, and engineering peers.",
      ],
      existingSkills: ["Programming", "Technical problem solving"],
      transferableSkills: ["Systems thinking", "Collaboration"],
      skillsToBuild: ["Testing", "Production systems", "Code review"],
      preview:
        "A typical week mixes implementation, debugging, review, and coordination with teammates.",
      challenges: [
        "Requirements can change while work is in progress.",
        "Production systems require attention to quality and maintainability.",
      ],
      stats: facts.roleStats["Software Engineer"],
    }),
    roleNode({
      id: "devops-mid",
      type: "role",
      label: "DevOps Engineer",
      eyebrow: "Intermediate role",
      summary:
        "Improve deployment, cloud infrastructure, automation, and service reliability.",
      stage: "Mid-level transition",
      whyItFits: [
        "Software fundamentals transfer into automation and infrastructure.",
        "Cloud learning provides a concrete bridge into the role.",
      ],
      responsibilities: [
        "Automate build and deployment workflows.",
        "Operate cloud infrastructure and monitor services.",
        "Partner with developers to improve reliability.",
      ],
      existingSkills: ["Programming", "Systems thinking"],
      transferableSkills: ["Debugging", "Operational judgment"],
      skillsToBuild: ["Cloud architecture", "Observability", "Infrastructure as code"],
      preview:
        "The work combines software, systems, and fast incident response across engineering teams.",
      challenges: [
        "Operational issues can be time-sensitive.",
        "Reliability work often requires balancing speed and risk.",
      ],
      stats: facts.roleStats["DevOps Engineer"],
    }),
    roleNode({
      id: "data-entry",
      type: "entry_role",
      label: "Data Scientist",
      eyebrow: "Entry role",
      summary:
        "Analyze data, test ideas, and communicate evidence that informs product or business decisions.",
      stage: "Early professional role",
      whyItFits: [
        "Mathematics and programming support the analytical core of the role.",
        "An applied project can demonstrate reasoning before extensive work history exists.",
      ],
      responsibilities: [
        "Prepare and explore datasets.",
        "Build and evaluate analytical models.",
        "Explain findings, uncertainty, and recommendations.",
      ],
      existingSkills: ["Quantitative reasoning", "Programming"],
      transferableSkills: ["Problem framing", "Evidence communication"],
      skillsToBuild: ["Experimentation", "Model evaluation", "Stakeholder context"],
      preview:
        "A typical project moves from an ambiguous question to analysis, validation, and a decision-oriented explanation.",
      challenges: [
        "Real data is incomplete and messy.",
        "A technically correct model may still fail to answer the useful question.",
      ],
      stats: facts.roleStats["Data Scientist"],
    }),
    roleNode({
      id: "data-senior",
      type: "destination",
      label: "Senior Data Scientist",
      eyebrow: "Possible destination",
      summary:
        "Lead ambiguous analytical work and shape how teams use data to make decisions.",
      stage: "Longer-term destination",
      whyItFits: [
        "The route builds on quantitative and software foundations.",
        "Engineering and project-first branches provide different ways to develop evidence.",
      ],
      responsibilities: [
        "Frame high-impact analytical questions.",
        "Guide model and experiment quality.",
        "Influence product and business decisions with evidence.",
      ],
      existingSkills: ["Technical depth", "Quantitative reasoning"],
      transferableSkills: ["Leadership", "Decision support"],
      skillsToBuild: ["Experiment design", "Technical leadership", "Domain expertise"],
      preview:
        "Senior data scientists spend substantial time shaping questions, reviewing evidence, and influencing decisions.",
      challenges: [
        "The role requires judgment beyond model-building.",
        "Impact depends on trust, communication, and domain understanding.",
      ],
      stats: facts.roleStats["Data Scientist"],
    }),
    roleNode({
      id: "product-entry",
      type: "entry_role",
      label: "Associate Product Manager",
      eyebrow: "Entry role",
      summary:
        "Support product discovery, prioritization, delivery, and outcome measurement.",
      stage: "Early professional role",
      whyItFits: [
        "Technical fluency helps with engineering collaboration.",
        "A product sprint can demonstrate discovery and prioritization.",
      ],
      responsibilities: [
        "Clarify user problems and requirements.",
        "Coordinate priorities with design and engineering.",
        "Measure whether shipped work improves an intended outcome.",
      ],
      existingSkills: ["Technical context", "Problem solving"],
      transferableSkills: ["Communication", "Structured decision making"],
      skillsToBuild: ["User discovery", "Prioritization", "Product metrics"],
      preview:
        "The role sits between user needs, business goals, and the teams that build the product.",
      challenges: [
        "There is rarely enough time or evidence to pursue every idea.",
        "Success depends on influence rather than direct authority.",
      ],
      stats: facts.roleStats["Product Manager"],
    }),
    roleNode({
      id: "product-mid",
      type: "destination",
      label: "Product Manager",
      eyebrow: "Possible destination",
      summary:
        "Own a product area, align teams around priorities, and evaluate outcomes.",
      stage: "Longer-term destination",
      whyItFits: [
        "The route combines technical credibility with user and business judgment.",
        "Project-first and technical-lead branches let the user test the work in different ways.",
      ],
      responsibilities: [
        "Set direction for a focused product area.",
        "Prioritize opportunities and align stakeholders.",
        "Partner with design and engineering through delivery and learning.",
      ],
      existingSkills: ["Technical fluency", "Analytical thinking"],
      transferableSkills: ["Ownership", "Cross-functional leadership"],
      skillsToBuild: ["Strategy", "Customer insight", "Outcome measurement"],
      preview:
        "A product manager spends more time clarifying tradeoffs and aligning people than writing specifications alone.",
      challenges: [
        "Priorities compete and evidence is often incomplete.",
        "The role requires clear communication across different disciplines.",
      ],
      stats: facts.roleStats["Product Manager"],
    }),
    roleNode({
      id: "ux-entry",
      type: "entry_role",
      label: "UX Designer",
      eyebrow: "Entry role",
      summary:
        "Research, prototype, and improve product experiences around user needs.",
      stage: "Early professional role",
      whyItFits: [
        "Technical understanding can improve collaboration with engineers.",
        "A portfolio case study provides visible evidence of user-centered reasoning.",
      ],
      responsibilities: [
        "Study user needs and workflows.",
        "Create and test interaction concepts.",
        "Collaborate with product and engineering through implementation.",
      ],
      existingSkills: ["Technical literacy", "Analytical thinking"],
      transferableSkills: ["Iteration", "Communication"],
      skillsToBuild: ["Interaction design", "User research", "Visual hierarchy"],
      preview:
        "The role combines research, systems thinking, prototyping, and detailed collaboration.",
      challenges: [
        "Feedback can be subjective unless tied to user evidence.",
        "Design decisions must account for technical and business constraints.",
      ],
      stats: facts.roleStats["UX Designer"],
    }),
    roleNode({
      id: "ux-mid",
      type: "destination",
      label: "Product Designer",
      eyebrow: "Possible destination",
      summary:
        "Shape end-to-end product experiences and guide design decisions across a product area.",
      stage: "Longer-term destination",
      whyItFits: [
        "The path combines user-centered methods with a technical foundation.",
        "Portfolio and technical-adjacent routes provide multiple entry strategies.",
      ],
      responsibilities: [
        "Lead discovery and interaction design for a product area.",
        "Create coherent experiences across complex workflows.",
        "Partner with product and engineering on quality and outcomes.",
      ],
      existingSkills: ["Technical context", "Problem decomposition"],
      transferableSkills: ["Systems thinking", "Facilitation"],
      skillsToBuild: ["Design strategy", "Research leadership", "Design systems"],
      preview:
        "Product designers balance user evidence, interaction quality, technical constraints, and product goals.",
      challenges: [
        "The work requires comfort with ambiguity and critique.",
        "Strong portfolios must explain decisions, not only display polished screens.",
      ],
      stats: facts.roleStats["UX Designer"],
    }),
  ];

  const edges: CareerEdge[] = [
    recommendedEdge(
      "current-cloud",
      "current",
      "course-cloud",
      "helpful_preparation",
      "A focused cloud course can turn software fundamentals into infrastructure-specific preparation.",
    ),
    recommendedEdge(
      "cloud-software",
      "course-cloud",
      "software-entry",
      "skill_bridge",
      "The course adds AWS and DevOps vocabulary to an existing software foundation.",
    ),
    observedEdge(
      "software-devops",
      "software-entry",
      "devops-mid",
      "Software Engineer (Entry) -> DevOps Engineer (Mid)",
      facts,
      "Software engineering and DevOps share automation, debugging, systems, and delivery responsibilities.",
    ),
    observedEdge(
      "devops-data",
      "devops-mid",
      "data-senior",
      "DevOps Engineer (Mid) -> Data Scientist (Senior)",
      facts,
      "This indirect route uses transferable systems and analytical skills. The PIT sequence is too sparse to present as privacy-safe historical evidence.",
    ),
    recommendedEdge(
      "current-ml",
      "current",
      "course-ml",
      "helpful_preparation",
      "Mathematics and computer science provide a useful base for Python, machine learning, and data analysis.",
    ),
    recommendedEdge(
      "ml-project",
      "course-ml",
      "skill-data-analysis",
      "skill_bridge",
      "The course introduces Python, machine learning, and analysis concepts that can be developed into an applied capability.",
    ),
    recommendedEdge(
      "data-skill-project",
      "skill-data-analysis",
      "data-project",
      "recommended_transition",
      "Applying data-analysis skills in a project creates stronger evidence than a course or self-reported skill alone.",
    ),
    recommendedEdge(
      "project-data-entry",
      "data-project",
      "data-entry",
      "recommended_transition",
      "A documented project can demonstrate data cleaning, analysis, and communication for an early-career application.",
    ),
    observedEdge(
      "data-entry-senior",
      "data-entry",
      "data-senior",
      "Data Scientist (Entry) -> Data Scientist (Mid)",
      facts,
      "Progression inside the role family is plausible, but the PIT dataset does not contain enough matching sequences to show privacy-safe aggregate evidence for this exact route.",
    ),
    recommendedEdge(
      "current-product-course",
      "current",
      "course-product",
      "helpful_preparation",
      "Project planning introduces the coordination methods used in product teams.",
    ),
    recommendedEdge(
      "product-course-project",
      "course-product",
      "skill-product-discovery",
      "skill_bridge",
      "Project planning and Agile concepts provide useful structure for developing product-discovery skills.",
    ),
    recommendedEdge(
      "product-skill-project",
      "skill-product-discovery",
      "product-project",
      "recommended_transition",
      "A discovery sprint applies interviewing, prioritization, and outcome framing to a real user problem.",
    ),
    recommendedEdge(
      "product-project-entry",
      "product-project",
      "product-entry",
      "recommended_transition",
      "The project creates evidence of user discovery, tradeoff decisions, and cross-functional delivery.",
    ),
    observedEdge(
      "product-entry-mid",
      "product-entry",
      "product-mid",
      "Product Manager (Entry) -> Product Manager (Mid)",
      facts,
      "The entry-to-mid progression is plausible within the role family, but the matching PIT sequence is below the privacy threshold and is not presented as historical evidence.",
    ),
    recommendedEdge(
      "current-software",
      "current",
      "software-entry",
      "recommended_transition",
      "Computer science and current technical experience support a direct early engineering route.",
    ),
    recommendedEdge(
      "software-feature-lead",
      "software-entry",
      "technical-lead-project",
      "recommended_transition",
      "Leading a cross-functional feature can add discovery, prioritization, and stakeholder evidence to engineering work.",
    ),
    recommendedEdge(
      "feature-lead-product",
      "technical-lead-project",
      "product-entry",
      "skill_bridge",
      "Feature ownership overlaps with several associate product responsibilities while keeping the transition grounded in technical experience.",
    ),
    recommendedEdge(
      "current-ux-course",
      "current",
      "course-ux",
      "helpful_preparation",
      "A design course introduces user-centered methods without requiring the user to abandon a technical path.",
    ),
    recommendedEdge(
      "ux-course-project",
      "course-ux",
      "skill-user-research",
      "skill_bridge",
      "The design course introduces methods that can be practiced as user-research and synthesis skills.",
    ),
    recommendedEdge(
      "ux-skill-project",
      "skill-user-research",
      "ux-project",
      "recommended_transition",
      "A case study turns user-research skills into inspectable evidence of process and judgment.",
    ),
    recommendedEdge(
      "ux-skill-entry",
      "skill-user-research",
      "ux-entry",
      "recommended_transition",
      "Demonstrated research and synthesis can support an early UX application when paired with technical context and a clear work sample.",
    ),
    recommendedEdge(
      "ux-project-entry",
      "ux-project",
      "ux-entry",
      "recommended_transition",
      "A well-documented portfolio project can support applications for an early UX role.",
    ),
    observedEdge(
      "ux-entry-mid",
      "ux-entry",
      "ux-mid",
      "UX Designer (Entry) -> UX Designer (Mid)",
      facts,
      "The entry-to-mid progression is plausible within the role family, but the matching PIT sequence is below the privacy threshold and is not presented as historical evidence.",
    ),
    recommendedEdge(
      "software-ux-course",
      "software-entry",
      "course-ux",
      "alternative",
      "This alternative keeps engineering as a starting point while adding user-centered design evidence.",
    ),
  ];

  return {
    id: "pathin-pit-technical-career-map",
    disclaimer:
      "These are possible routes built from profile signals and a synthetic aggregate dataset, not predictions or guaranteed outcomes.",
    profile: {
      name: "Winston Iskandar",
      headline: "Similate, Inc. | CS/Math at Stanford",
      location: "United States",
      education: ["Computer Science and Mathematics at Stanford University"],
      experience: ["Similate, Inc.", "Jane Street"],
      skills: [
        "Software problem solving",
        "Quantitative reasoning",
        "Technical communication",
      ],
      interests: ["AI", "Product", "Career discovery"],
    },
    nodes,
    edges,
    paths: [
      {
        id: "data-engineering",
        label: "Engineering-to-data route",
        shortLabel: "Engineering route",
        destinationId: "data-senior",
        nodeIds: [
          "current",
          "course-cloud",
          "software-entry",
          "devops-mid",
          "data-senior",
        ],
        description:
          "Build production and infrastructure depth, then add explicit analytical evidence before pursuing senior data work.",
        strategy: "Observed technical transitions",
      },
      {
        id: "data-project",
        label: "Project-first data route",
        shortLabel: "Project-first",
        destinationId: "data-senior",
        nodeIds: [
          "current",
          "course-ml",
          "skill-data-analysis",
          "data-project",
          "data-entry",
          "data-senior",
        ],
        description:
          "Turn quantitative skills into a visible project, then enter the data role family directly.",
        strategy: "Lower-barrier evidence building",
      },
      {
        id: "product-project",
        label: "Discovery-First product route",
        shortLabel: "Discovery-First",
        destinationId: "product-mid",
        nodeIds: [
          "current",
          "course-product",
          "skill-product-discovery",
          "product-project",
          "product-entry",
          "product-mid",
        ],
        description:
          "Learn product workflow, run a focused discovery sprint, and use the result as evidence for an entry product role.",
        strategy: "Project-first transition",
      },
      {
        id: "product-technical",
        label: "Technical product route",
        shortLabel: "Technical route",
        destinationId: "product-mid",
        nodeIds: [
          "current",
          "software-entry",
          "technical-lead-project",
          "product-entry",
          "product-mid",
        ],
        description:
          "Stay close to engineering while adding feature ownership, user context, and cross-functional leadership.",
        strategy: "Transferable-skills transition",
      },
      {
        id: "ux-portfolio",
        label: "Portfolio-first design route",
        shortLabel: "Portfolio-first",
        destinationId: "ux-mid",
        nodeIds: [
          "current",
          "course-ux",
          "skill-user-research",
          "ux-project",
          "ux-entry",
          "ux-mid",
        ],
        description:
          "Learn core design methods, create one evidence-rich case study, and enter the UX role family.",
        strategy: "Portfolio evidence",
      },
      {
        id: "ux-technical",
        label: "Engineering-to-design route",
        shortLabel: "Technical route",
        destinationId: "ux-mid",
        nodeIds: [
          "current",
          "software-entry",
          "course-ux",
          "skill-user-research",
          "ux-entry",
          "ux-mid",
        ],
        description:
          "Use engineering experience as context, then add user-centered design methods and portfolio evidence.",
        strategy: "Adjacent-role transition",
      },
    ],
    explorePathIds: ["data-project", "product-project", "ux-portfolio"],
    buildPathIdsByDestination: {
      "data-senior": ["data-project", "data-engineering"],
      "product-mid": ["product-project", "product-technical"],
      "ux-mid": ["ux-portfolio", "ux-technical"],
    },
    destinationIds: ["data-senior", "product-mid", "ux-mid"],
    source: {
      name: "Possibilities in Tech Hackathon 2026 dataset",
      url: PIT_URL,
      fetchedAt,
      status: dataset ? "live" : "snapshot",
      memberCount: facts.memberCount,
      jobCount: facts.jobCount,
      courseCount: facts.courseCount,
      cohortCount: facts.cohortCount,
      note:
        "The dataset is synthetic. Cohort counts are aggregate evidence for a prototype and should not be interpreted as labor-market probabilities.",
    },
    generation: {
      dataVersion: dataset ? "pit-live-2026-06" : "pit-snapshot-2026-06-23",
      modelVersion: "pathin-rules-0.1",
      promptVersion: "prd-1.0",
    },
  };
}
