/**
 * Demo-mode seed. Generates a fully populated, internally consistent world:
 * a candidate mid-search, 60+ scored opportunities, a live application
 * pipeline, a staffed expert marketplace with an active review queue,
 * interviews, mock sessions, and a career-health history.
 *
 * Deterministic (seeded RNG) so every fresh boot demos identically.
 */
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { analyzeMatch, scoreAts } from "@/lib/engines/scoring";
import { seededRandom } from "@/lib/utils";

type DB = PgliteDatabase<typeof schema>;

const rand = seededRandom(20260611);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

export const DEMO_CANDIDATE_ID = "user-demo-candidate";
export const DEMO_EXPERT_USER_ID = "user-demo-expert";
export const DEMO_EXPERT_ID = "expert-01";

/* ── Source data ───────────────────────────────────────────── */

const COMPANIES = [
  "Lumera", "Vantage Labs", "Driftline", "NorthBeam", "Cobalt Systems",
  "Helix Health", "Marble", "Atlas Pay", "Brightpath", "Solara Energy",
  "Kitespan", "Mosaic Analytics", "Pinewood Robotics", "Tidemark", "Veriton",
  "Crescent AI", "Orbital Commerce", "Stackline", "Bluefin Data", "Harborview",
  "Nimbus Cloud", "Redwood Security", "Featherlight", "Quillon", "Ferrowave",
];

const LOCATIONS = [
  "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA",
  "Denver, CO", "Boston, MA", "Toronto, ON", "London, UK", "Berlin, DE",
];

interface RoleTemplate {
  titles: string[];
  skills: string[][];
  seniorities: { name: string; salary: [number, number] }[];
}

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    titles: ["Frontend Engineer", "Software Engineer, Frontend", "UI Engineer", "Web Engineer"],
    skills: [
      ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL", "Testing Library"],
      ["React", "TypeScript", "Redux", "CSS", "Webpack", "Accessibility"],
      ["React", "TypeScript", "Next.js", "Node.js", "Design Systems", "Performance Optimization"],
      ["Vue.js", "TypeScript", "Vite", "CSS", "REST APIs", "Storybook"],
    ],
    seniorities: [
      { name: "mid", salary: [120, 155] },
      { name: "senior", salary: [155, 205] },
      { name: "staff", salary: [195, 260] },
    ],
  },
  {
    titles: ["Full Stack Engineer", "Software Engineer", "Product Engineer", "Founding Engineer"],
    skills: [
      ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "Docker"],
      ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Stripe", "Vercel"],
      ["React", "Node.js", "GraphQL", "PostgreSQL", "Redis", "Kubernetes"],
      ["TypeScript", "React", "Python", "PostgreSQL", "CI/CD", "System Design"],
    ],
    seniorities: [
      { name: "mid", salary: [125, 160] },
      { name: "senior", salary: [160, 215] },
      { name: "staff", salary: [205, 275] },
    ],
  },
  {
    titles: ["Backend Engineer", "Software Engineer, Platform", "API Engineer", "Infrastructure Engineer"],
    skills: [
      ["Node.js", "TypeScript", "PostgreSQL", "Redis", "AWS", "Microservices"],
      ["Go", "PostgreSQL", "Kubernetes", "gRPC", "Observability", "System Design"],
      ["Python", "Django", "PostgreSQL", "Celery", "AWS", "REST APIs"],
      ["Java", "Spring Boot", "Kafka", "PostgreSQL", "Docker", "System Design"],
    ],
    seniorities: [
      { name: "senior", salary: [160, 210] },
      { name: "staff", salary: [200, 270] },
    ],
  },
  {
    titles: ["Product Manager", "Senior Product Manager", "Product Lead"],
    skills: [
      ["Product Strategy", "User Research", "SQL", "A/B Testing", "Roadmapping", "Stakeholder Management"],
      ["Product Analytics", "Figma", "Agile", "Go-to-Market", "User Research", "Experimentation"],
    ],
    seniorities: [
      { name: "mid", salary: [130, 165] },
      { name: "senior", salary: [165, 215] },
    ],
  },
  {
    titles: ["Product Designer", "Senior Product Designer", "Design Engineer"],
    skills: [
      ["Figma", "Design Systems", "Prototyping", "User Research", "Interaction Design", "Accessibility"],
      ["Figma", "React", "TypeScript", "Design Systems", "Motion Design", "CSS"],
    ],
    seniorities: [
      { name: "mid", salary: [115, 150] },
      { name: "senior", salary: [150, 195] },
    ],
  },
  {
    titles: ["Data Engineer", "Analytics Engineer", "Machine Learning Engineer"],
    skills: [
      ["Python", "SQL", "dbt", "Airflow", "Snowflake", "Data Modeling"],
      ["Python", "PyTorch", "SQL", "MLOps", "AWS", "LLM"],
    ],
    seniorities: [
      { name: "mid", salary: [135, 170] },
      { name: "senior", salary: [170, 225] },
    ],
  },
];

function jobDescription(title: string, company: string, skills: string[], seniority: string): string {
  return [
    `${company} is looking for a ${seniority}-level ${title} to join a team shipping product that customers rely on every day. You will own meaningful surface area from week one, working closely with product, design, and other engineers.`,
    `You'll spend most of your time building and improving core product experiences with ${skills.slice(0, 3).join(", ")}, with strong attention to quality, performance, and maintainability. We value pragmatic engineers who communicate clearly, make sound trade-offs, and raise the bar for the people around them.`,
    `Our interview process is designed to be fast and respectful of your time: a recruiter screen, a technical conversation, a practical exercise grounded in real work, and a final conversation with the team.`,
  ].join("\n\n");
}

function jobRequirements(skills: string[], seniority: string, years: [number, number]): string[] {
  return [
    `${years[0]}+ years of professional experience in a similar role`,
    `Deep, hands-on experience with ${skills[0]} and ${skills[1]}`,
    `Production experience with ${skills.slice(2, 4).join(" and ")}`,
    `Track record of shipping high-quality product ${seniority === "staff" ? "and setting technical direction for a team" : "in a collaborative team"}`,
    `Clear written and verbal communication`,
  ];
}

const SENIORITY_YEARS: Record<string, [number, number]> = {
  mid: [2, 5], senior: [5, 9], staff: [8, 14],
};

/* ── Seed entry point ──────────────────────────────────────── */

export async function seedIfEmpty(db: DB): Promise<void> {
  const existing = await db.select({ c: sql<number>`count(*)` }).from(schema.users);
  if (Number(existing[0].c) > 0) return;

  /* Users */
  const candidateSkills = [
    "React", "TypeScript", "Next.js", "Node.js", "Tailwind CSS",
    "GraphQL", "PostgreSQL", "Testing Library", "Design Systems", "CI/CD",
  ];

  await db.insert(schema.users).values([
    { id: DEMO_CANDIDATE_ID, email: "alex@demo.jobradar.app", name: "Alex Morgan", role: "candidate" },
    { id: DEMO_EXPERT_USER_ID, email: "sarah@demo.jobradar.app", name: "Sarah Chen", role: "expert" },
    { id: "user-cand-2", email: "jordan@demo.jobradar.app", name: "Jordan Lee", role: "candidate" },
    { id: "user-cand-3", email: "priya@demo.jobradar.app", name: "Priya Patel", role: "candidate" },
    { id: "user-cand-4", email: "marcus@demo.jobradar.app", name: "Marcus Webb", role: "candidate" },
  ]);

  const expertPeople = [
    { id: DEMO_EXPERT_USER_ID, name: "Sarah Chen" },
    { id: "user-exp-2", name: "David Okafor" },
    { id: "user-exp-3", name: "Emily Rodriguez" },
    { id: "user-exp-4", name: "Michael Tan" },
    { id: "user-exp-5", name: "Rachel Goldstein" },
    { id: "user-exp-6", name: "James Whitfield" },
    { id: "user-exp-7", name: "Aisha Mohammed" },
    { id: "user-exp-8", name: "Tom Nakamura" },
    { id: "user-exp-9", name: "Linda Park" },
    { id: "user-exp-10", name: "Carlos Mendoza" },
    { id: "user-exp-11", name: "Nina Petrov" },
    { id: "user-exp-12", name: "Greg Sullivan" },
  ];
  await db.insert(schema.users).values(
    expertPeople.slice(1).map((p) => ({
      id: p.id,
      email: `${p.name.split(" ")[0].toLowerCase()}@demo.jobradar.app`,
      name: p.name,
      role: "expert" as const,
    }))
  );

  await db.insert(schema.candidateProfiles).values([
    {
      userId: DEMO_CANDIDATE_ID,
      headline: "Senior Frontend Engineer · React / TypeScript / Next.js",
      location: "Austin, TX (open to remote)",
      yearsExperience: 7,
      targetRoles: ["Senior Frontend Engineer", "Full Stack Engineer", "Staff Frontend Engineer", "Product Engineer"],
      targetSalaryMin: 165000,
      skills: candidateSkills,
      summary:
        "Product-focused frontend engineer with 7 years building design-system-driven web apps at scale. Led migration to Next.js serving 4M MAU; obsessed with performance and DX.",
      linkedinUrl: "https://linkedin.com/in/alexmorgan-demo",
      plan: "accelerator",
      reviewCredits: 2,
      weeklyApplicationGoal: 10,
    },
    { userId: "user-cand-2", headline: "Product Manager", yearsExperience: 5, targetRoles: ["Senior Product Manager"], skills: ["Product Strategy", "SQL", "A/B Testing"], plan: "pro", location: "New York, NY" },
    { userId: "user-cand-3", headline: "Backend Engineer", yearsExperience: 4, targetRoles: ["Backend Engineer"], skills: ["Go", "PostgreSQL", "Kubernetes"], plan: "accelerator", reviewCredits: 1, location: "Seattle, WA" },
    { userId: "user-cand-4", headline: "Product Designer", yearsExperience: 6, targetRoles: ["Senior Product Designer"], skills: ["Figma", "Design Systems", "Prototyping"], plan: "free", location: "Remote" },
  ]);

  /* Jobs — 60 generated, weighted toward the demo candidate's track */
  const jobs: (typeof schema.jobs.$inferInsert)[] = [];
  const usedCompanyTitle = new Set<string>();
  let jobN = 0;
  while (jobs.length < 60) {
    // 55% frontend/fullstack so the demo pipeline has strong matches
    const r = rand();
    const template =
      r < 0.3 ? ROLE_TEMPLATES[0] : r < 0.55 ? ROLE_TEMPLATES[1] : pick(ROLE_TEMPLATES.slice(2));
    const seniority = pick(template.seniorities);
    const title = pick(template.titles);
    const company = pick(COMPANIES);
    const key = `${company}:${title}:${seniority.name}`;
    if (usedCompanyTitle.has(key)) continue;
    usedCompanyTitle.add(key);
    jobN++;
    const skills = pick(template.skills);
    const remote = rand() < 0.45;
    const displayTitle =
      seniority.name === "senior" && !title.toLowerCase().includes("senior")
        ? `Senior ${title}`
        : seniority.name === "staff" && !title.toLowerCase().includes("staff")
          ? `Staff ${title}`
          : title;
    jobs.push({
      id: `job-${String(jobN).padStart(3, "0")}`,
      title: displayTitle,
      company,
      companyDomain: `${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      location: remote ? "Remote" : pick(LOCATIONS),
      remote,
      salaryMin: seniority.salary[0] * 1000,
      salaryMax: seniority.salary[1] * 1000,
      description: jobDescription(title, company, skills, seniority.name),
      requirements: jobRequirements(skills, seniority.name, SENIORITY_YEARS[seniority.name]),
      skills,
      seniority: seniority.name,
      applicantEstimate: int(25, 320),
      postedAt: daysAgo(int(0, 21) + rand()),
      source: "seed",
    });
  }
  await db.insert(schema.jobs).values(jobs);

  /* Documents — base resume + cover letter for the demo candidate */
  const baseResumeContent = `ALEX MORGAN
Senior Frontend Engineer — Austin, TX · alex@demo.jobradar.app · linkedin.com/in/alexmorgan-demo

SUMMARY
Product-focused frontend engineer with 7 years of experience building design-system-driven web applications at scale. Led the migration of a 4M-MAU consumer product to Next.js, cutting p75 LCP by 38%. Passionate about performance, accessibility, and developer experience.

EXPERIENCE

Senior Frontend Engineer — Driftline (2022–Present)
- Led migration from CRA to Next.js App Router across 240k LOC, reducing p75 LCP from 4.1s to 2.5s (-38%) and increasing organic signups 12%
- Built the company design system (React, TypeScript, Tailwind CSS) adopted by 5 product teams, cutting feature UI build time ~40%
- Drove GraphQL adoption with persisted queries, reducing over-fetching and cutting payload sizes 55%
- Mentored 4 engineers; introduced Testing Library + CI quality gates raising coverage from 31% to 78%

Frontend Engineer — Stackline (2019–2022)
- Shipped real-time analytics dashboards (React, Redux, WebSockets) used by 800+ enterprise customers
- Reduced bundle size 47% via code-splitting and dependency audits; improved TTI by 1.9s
- Co-led accessibility initiative reaching WCAG 2.1 AA across core flows

Software Engineer — Harborview (2017–2019)
- Built customer onboarding flows in React/Node.js increasing activation rate 18%
- Implemented CI/CD pipelines (GitHub Actions) cutting release cycle from 2 weeks to daily

SKILLS
React, TypeScript, Next.js, Node.js, Tailwind CSS, GraphQL, PostgreSQL, Testing Library, Design Systems, CI/CD, Performance Optimization, Accessibility

EDUCATION
B.S. Computer Science — University of Texas at Austin (2017)`;

  await db.insert(schema.documents).values([
    {
      id: "doc-resume-base",
      userId: DEMO_CANDIDATE_ID,
      type: "resume",
      title: "Master Resume — Alex Morgan",
      content: baseResumeContent,
      version: 3,
      atsScore: 82,
      createdAt: daysAgo(40),
      updatedAt: daysAgo(6),
    },
    {
      id: "doc-cover-base",
      userId: DEMO_CANDIDATE_ID,
      type: "cover_letter",
      title: "Cover Letter Template",
      content:
        "Dear Hiring Team,\n\nI'm a senior frontend engineer with 7 years of experience building performant, design-system-driven products. At Driftline I led our Next.js migration, cutting p75 LCP 38% and lifting signups 12%. I'm drawn to teams that treat the frontend as a product surface, not an afterthought.\n\nI'd love to talk about how I can help your team ship faster with higher quality.\n\nBest,\nAlex Morgan",
      version: 1,
      atsScore: 74,
      createdAt: daysAgo(35),
      updatedAt: daysAgo(35),
    },
    {
      id: "doc-resume-cand3",
      userId: "user-cand-3",
      type: "resume",
      title: "Resume — Priya Patel",
      content:
        "PRIYA PATEL\nBackend Engineer — Seattle, WA\n\nEXPERIENCE\nBackend Engineer — Nimbus Cloud (2021–Present)\n- Built Go microservices handling 40k RPS with p99 < 80ms\n- Led Kubernetes migration reducing infra cost 28%\n\nSoftware Engineer — Bluefin Data (2019–2021)\n- Designed PostgreSQL schemas and APIs for analytics ingestion (2TB/day)\n\nSKILLS\nGo, PostgreSQL, Kubernetes, gRPC, Redis, AWS",
      version: 1,
      atsScore: 76,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },
    {
      id: "doc-resume-cand4",
      userId: "user-cand-4",
      type: "resume",
      title: "Resume — Marcus Webb",
      content:
        "MARCUS WEBB\nProduct Designer — Remote\n\nEXPERIENCE\nProduct Designer — Featherlight (2020–Present)\n- Redesigned onboarding lifting activation 22%\n- Built and maintained Figma design system used by 3 squads\n\nSKILLS\nFigma, Design Systems, Prototyping, User Research",
      version: 1,
      atsScore: 68,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
    },
    {
      id: "doc-cover-cand2",
      userId: "user-cand-2",
      type: "cover_letter",
      title: "Cover Letter — Jordan Lee",
      content:
        "Dear Hiring Team,\n\nAs a PM with 5 years in B2B SaaS, I've shipped experimentation programs that lifted conversion 15%+. I'm excited about your data platform...\n\nBest,\nJordan Lee",
      version: 1,
      atsScore: 70,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
  ]);

  /* Matches for the demo candidate across all jobs */
  const candidateSignal = {
    skills: candidateSkills,
    yearsExperience: 7,
    targetRoles: ["Senior Frontend Engineer", "Full Stack Engineer", "Staff Frontend Engineer", "Product Engineer"],
    resumeAtsScore: 82,
  };
  const matchRows = jobs.map((j, idx) => {
    const a = analyzeMatch(candidateSignal, {
      title: j.title!,
      skills: j.skills as string[],
      seniority: j.seniority!,
      postedAt: j.postedAt as Date,
      applicantEstimate: j.applicantEstimate,
      remote: j.remote,
    });
    return {
      id: `match-${String(idx + 1).padStart(3, "0")}`,
      userId: DEMO_CANDIDATE_ID,
      jobId: j.id!,
      interviewProbability: a.interviewProbability,
      matchScore: a.matchScore,
      matchReasons: a.matchReasons,
      strengths: a.strengths,
      gaps: a.gaps,
      priority: a.priority,
      competition: a.competition,
    };
  });
  await db.insert(schema.jobMatches).values(matchRows);

  /* Application pipeline — realistic spread over the past 5 weeks */
  const sortedMatches = [...matchRows].sort((a, b) => b.interviewProbability - a.interviewProbability);
  const goodJobs = sortedMatches.slice(0, 24).map((m) => m.jobId);
  const stagePlan: { stage: schema.ApplicationStage; count: number }[] = [
    { stage: "saved", count: 3 },
    { stage: "preparing", count: 2 },
    { stage: "reviewed", count: 1 },
    { stage: "applied", count: 5 },
    { stage: "assessment", count: 1 },
    { stage: "interview", count: 2 },
    { stage: "final_round", count: 1 },
    { stage: "offer", count: 1 },
    { stage: "rejected", count: 2 },
  ];
  const appRows: (typeof schema.applications.$inferInsert)[] = [];
  const eventRows: (typeof schema.applicationEvents.$inferInsert)[] = [];
  const tailoredDocs: (typeof schema.documents.$inferInsert)[] = [];
  let appN = 0;
  let jobCursor = 0;
  for (const { stage, count } of stagePlan) {
    for (let k = 0; k < count; k++) {
      appN++;
      const jobId = goodJobs[jobCursor++];
      const job = jobs.find((j) => j.id === jobId)!;
      const id = `app-${String(appN).padStart(3, "0")}`;
      const createdDays = stage === "saved" || stage === "preparing" ? int(0, 4) : int(5, 35);
      const applied = ["applied", "assessment", "interview", "final_round", "offer", "rejected"].includes(stage);
      const appliedDays = applied ? Math.max(1, createdDays - int(0, 2)) : null;

      let resumeDocId: string | null = "doc-resume-base";
      if (applied || stage === "reviewed") {
        const tailoredId = `doc-resume-${id}`;
        const content = baseResumeContent.replace(
          "SUMMARY\n",
          `SUMMARY (tailored for ${job.company} — ${job.title})\n`
        );
        tailoredDocs.push({
          id: tailoredId,
          userId: DEMO_CANDIDATE_ID,
          type: "resume",
          title: `Resume — ${job.company} (${job.title})`,
          content,
          version: 1,
          baseDocumentId: "doc-resume-base",
          jobId,
          atsScore: scoreAts(content, job.skills as string[]),
          createdAt: daysAgo(createdDays),
          updatedAt: daysAgo(createdDays),
        });
        resumeDocId = tailoredId;
      }

      const needsFollowUp = stage === "applied" && k < 3;
      appRows.push({
        id,
        userId: DEMO_CANDIDATE_ID,
        jobId,
        stage,
        resumeDocumentId: resumeDocId,
        coverLetterDocumentId: applied ? "doc-cover-base" : null,
        appliedAt: appliedDays ? daysAgo(appliedDays) : null,
        nextActionAt: needsFollowUp
          ? daysAgo(k === 0 ? 2 : -2)
          : stage === "preparing"
            ? daysFromNow(1)
            : null,
        nextActionLabel: needsFollowUp
          ? "Send follow-up to recruiter"
          : stage === "preparing"
            ? "Finish tailored resume and submit"
            : null,
        lastActivityAt: daysAgo(Math.min(createdDays, int(0, 5))),
        createdAt: daysAgo(createdDays),
        notes: stage === "offer" ? "Verbal offer received — comp discussion scheduled." : null,
      });

      eventRows.push({
        id: `evt-${id}-created`,
        applicationId: id,
        type: "created",
        detail: `Saved ${job.title} at ${job.company}`,
        createdAt: daysAgo(createdDays),
      });
      if (applied) {
        eventRows.push({
          id: `evt-${id}-applied`,
          applicationId: id,
          type: "stage_change",
          detail: "Application submitted",
          createdAt: daysAgo(appliedDays!),
        });
      }
      if (["interview", "final_round", "offer"].includes(stage)) {
        eventRows.push({
          id: `evt-${id}-interview`,
          applicationId: id,
          type: "stage_change",
          detail: "Moved to Interview — recruiter scheduled a call",
          createdAt: daysAgo(Math.max(1, appliedDays! - 4)),
        });
      }
      if (stage === "rejected") {
        eventRows.push({
          id: `evt-${id}-rejected`,
          applicationId: id,
          type: "stage_change",
          detail: "Rejection received",
          createdAt: daysAgo(int(1, 4)),
        });
      }
    }
  }
  await db.insert(schema.documents).values(tailoredDocs);
  await db.insert(schema.applications).values(appRows);
  await db.insert(schema.applicationEvents).values(eventRows);

  /* Experts */
  const expertDefs: (typeof schema.experts.$inferInsert)[] = [
    { id: DEMO_EXPERT_ID, userId: DEMO_EXPERT_USER_ID, headline: "Ex-Google Senior Recruiter · 9,000+ resumes reviewed", bio: "Sarah spent 8 years in technical recruiting at Google and two YC startups. She has reviewed over 9,000 engineering resumes and knows exactly what makes a screener stop scrolling.", categories: ["recruiter", "resume_expert"], industries: ["Technology", "SaaS"], specializations: ["Software Engineering", "Frontend", "Resume Strategy"], verified: true, yearsExperience: 12, rating: 4.9, reviewsCount: 412, servicesCompleted: 1240, interviewSuccessRate: 78, avgResponseMinutes: 95, availableNow: true },
    { id: "expert-02", userId: "user-exp-2", headline: "Engineering Hiring Manager · Staff interviews at scale-ups", bio: "David has run 600+ engineering interview loops as a hiring manager at two unicorns. He coaches candidates on what panels actually evaluate.", categories: ["hiring_manager", "interview_coach"], industries: ["Technology", "Fintech"], specializations: ["System Design", "Behavioral Interviews", "Engineering Leadership"], verified: true, yearsExperience: 15, rating: 4.8, reviewsCount: 268, servicesCompleted: 730, interviewSuccessRate: 74, avgResponseMinutes: 180, availableNow: true },
    { id: "expert-03", userId: "user-exp-3", headline: "ATS Specialist · Former Workday & Greenhouse consultant", bio: "Emily configures ATS systems for a living. She knows precisely how parsers read your resume — and how to stop them from silently discarding it.", categories: ["ats_expert", "resume_expert"], industries: ["Technology", "Healthcare", "Finance"], specializations: ["ATS Optimization", "Keyword Strategy", "Formatting"], verified: true, yearsExperience: 9, rating: 4.9, reviewsCount: 351, servicesCompleted: 980, interviewSuccessRate: 71, avgResponseMinutes: 60, availableNow: true },
    { id: "expert-04", userId: "user-exp-4", headline: "Interview Coach · FAANG offers ×142 coached", bio: "Michael is a former Meta E6 who has coached 142 candidates to FAANG offers. Behavioral storytelling and technical communication are his specialty.", categories: ["interview_coach"], industries: ["Technology"], specializations: ["Behavioral Interviews", "Technical Communication", "FAANG Loops"], verified: true, yearsExperience: 11, rating: 5.0, reviewsCount: 198, servicesCompleted: 540, interviewSuccessRate: 82, avgResponseMinutes: 240, availableNow: false },
    { id: "expert-05", userId: "user-exp-5", headline: "Executive Career Advisor · VP/C-suite transitions", bio: "Rachel advises directors through C-suite on positioning, narrative, and negotiation. Former executive search partner.", categories: ["executive_advisor", "career_coach"], industries: ["Technology", "Finance", "Consumer"], specializations: ["Executive Positioning", "Negotiation", "Board Networking"], verified: true, yearsExperience: 18, rating: 4.9, reviewsCount: 87, servicesCompleted: 210, interviewSuccessRate: 69, avgResponseMinutes: 480, availableNow: true },
    { id: "expert-06", userId: "user-exp-6", headline: "Salary Negotiation Specialist · $4.2M in comp increases", bio: "James has negotiated on behalf of 300+ tech candidates, averaging $31k in added first-year compensation.", categories: ["career_coach"], industries: ["Technology", "Fintech"], specializations: ["Salary Negotiation", "Offer Strategy", "Equity"], verified: true, yearsExperience: 10, rating: 4.8, reviewsCount: 176, servicesCompleted: 388, interviewSuccessRate: null, avgResponseMinutes: 120, availableNow: true },
    { id: "expert-07", userId: "user-exp-7", headline: "Tech Recruiter · Startup & scale-up hiring", bio: "Aisha recruits engineers for seed-to-Series-C startups. She'll tell you exactly how your profile lands in a recruiter's queue.", categories: ["recruiter"], industries: ["Technology", "Climate"], specializations: ["Startup Hiring", "LinkedIn Optimization", "Outreach Strategy"], verified: true, yearsExperience: 7, rating: 4.7, reviewsCount: 142, servicesCompleted: 365, interviewSuccessRate: 66, avgResponseMinutes: 90, availableNow: true },
    { id: "expert-08", userId: "user-exp-8", headline: "Staff Engineer · Technical interview prep (algorithms/system design)", bio: "Tom is a staff engineer at a major cloud provider and a long-time interviewer. He runs realistic technical mocks with detailed scorecards.", categories: ["interview_coach", "hiring_manager"], industries: ["Technology"], specializations: ["System Design", "Algorithms", "Code Review Interviews"], verified: true, yearsExperience: 13, rating: 4.9, reviewsCount: 224, servicesCompleted: 612, interviewSuccessRate: 79, avgResponseMinutes: 300, availableNow: true },
    { id: "expert-09", userId: "user-exp-9", headline: "Career Coach · Mid-career pivots into tech", bio: "Linda specializes in repositioning experienced professionals into product, data, and engineering-adjacent roles.", categories: ["career_coach", "resume_expert"], industries: ["Technology", "Education", "Healthcare"], specializations: ["Career Pivots", "Narrative Strategy", "Personal Branding"], verified: false, yearsExperience: 8, rating: 4.6, reviewsCount: 98, servicesCompleted: 240, interviewSuccessRate: 58, avgResponseMinutes: 200, availableNow: true },
    { id: "expert-10", userId: "user-exp-10", headline: "Hiring Manager · Product & design org leader", bio: "Carlos has built product and design teams at three startups. He reviews PM and designer portfolios with a hiring manager's eye.", categories: ["hiring_manager", "career_coach"], industries: ["Technology", "Consumer"], specializations: ["Product Management", "Design Portfolios", "Case Interviews"], verified: true, yearsExperience: 14, rating: 4.8, reviewsCount: 131, servicesCompleted: 295, interviewSuccessRate: 72, avgResponseMinutes: 360, availableNow: false },
    { id: "expert-11", userId: "user-exp-11", headline: "Resume Writer · 2,000+ tech resumes, ex-Amazon recruiter", bio: "Nina pairs recruiter instincts with sharp writing. Fast turnarounds, surgical edits, measurable response-rate lifts.", categories: ["resume_expert", "ats_expert"], industries: ["Technology", "E-commerce"], specializations: ["Resume Writing", "ATS Optimization", "Amazon-style Bar Raising"], verified: true, yearsExperience: 9, rating: 4.8, reviewsCount: 305, servicesCompleted: 840, interviewSuccessRate: 70, avgResponseMinutes: 75, availableNow: true },
    { id: "expert-12", userId: "user-exp-12", headline: "Interview Coach · Behavioral specialist (STAR+)", bio: "Greg turns scattered career stories into crisp, memorable interview answers. Former corporate L&D leader.", categories: ["interview_coach", "career_coach"], industries: ["Technology", "Finance", "Consulting"], specializations: ["Behavioral Interviews", "Storytelling", "Executive Presence"], verified: false, yearsExperience: 12, rating: 4.5, reviewsCount: 76, servicesCompleted: 188, interviewSuccessRate: 61, avgResponseMinutes: 420, availableNow: true },
  ];
  await db.insert(schema.experts).values(expertDefs);

  /* Expert services */
  const serviceCatalog: Record<string, { type: schema.ServiceType; title: string; description: string; price: [number, number]; turnaround: number }[]> = {
    resume: [
      { type: "resume_review", title: "Deep Resume Review", description: "Line-by-line review with rewrite suggestions, ATS keyword audit, and a recorded walkthrough.", price: [89, 149], turnaround: 48 },
    ],
    cover: [
      { type: "cover_letter_review", title: "Cover Letter Review", description: "Punch up your narrative, cut filler, and align to the target role.", price: [49, 79], turnaround: 24 },
    ],
    linkedin: [
      { type: "linkedin_review", title: "LinkedIn Profile Optimization", description: "Headline, about, and experience rewrite plan to lift recruiter search visibility.", price: [69, 119], turnaround: 48 },
    ],
    mock: [
      { type: "mock_interview", title: "60-min Mock Interview", description: "Realistic interview with detailed scorecard and prioritized improvement plan.", price: [129, 249], turnaround: 72 },
    ],
    coaching: [
      { type: "coaching", title: "Career Strategy Session", description: "45-minute 1:1 to set targeting, narrative, and a weekly action plan.", price: [99, 199], turnaround: 72 },
    ],
    nego: [
      { type: "salary_negotiation", title: "Offer Negotiation Support", description: "Comp benchmarking, counter scripting, and live support through your negotiation.", price: [149, 299], turnaround: 24 },
    ],
  };
  const svcRows: (typeof schema.expertServices.$inferInsert)[] = [];
  let svcN = 0;
  for (const e of expertDefs) {
    const cats = e.categories as string[];
    const offered: (keyof typeof serviceCatalog)[] = [];
    if (cats.includes("resume_expert") || cats.includes("recruiter") || cats.includes("ats_expert")) offered.push("resume", "linkedin");
    if (cats.includes("recruiter") || cats.includes("resume_expert")) offered.push("cover");
    if (cats.includes("interview_coach") || cats.includes("hiring_manager")) offered.push("mock");
    if (cats.includes("career_coach") || cats.includes("executive_advisor")) offered.push("coaching");
    if ((e.specializations as string[]).some((s) => s.toLowerCase().includes("negotiation"))) offered.push("nego");
    for (const key of [...new Set(offered)]) {
      for (const s of serviceCatalog[key]) {
        svcN++;
        svcRows.push({
          id: `svc-${String(svcN).padStart(3, "0")}`,
          expertId: e.id!,
          type: s.type,
          title: s.title,
          description: s.description,
          priceCents: int(s.price[0], s.price[1]) * 100,
          turnaroundHours: s.turnaround,
        });
      }
    }
  }
  await db.insert(schema.expertServices).values(svcRows);

  /* Review queue — mix of states so both sides of the marketplace are alive */
  await db.insert(schema.reviewRequests).values([
    // Candidate's completed review (with feedback below)
    { id: "rr-001", candidateId: DEMO_CANDIDATE_ID, serviceType: "resume_review", documentId: "doc-resume-base", status: "completed", claimedBy: "expert-03", claimedAt: daysAgo(9), priceCents: 12900, deliveredAt: daysAgo(8), completedAt: daysAgo(7), createdAt: daysAgo(10), instructions: "Targeting senior frontend roles at product-led startups. Focus on ATS and impact bullets." },
    // Candidate's delivered review awaiting acceptance
    { id: "rr-002", candidateId: DEMO_CANDIDATE_ID, serviceType: "cover_letter_review", documentId: "doc-cover-base", status: "delivered", claimedBy: DEMO_EXPERT_ID, claimedAt: daysAgo(2), priceCents: 5900, deliveredAt: daysAgo(0.5), createdAt: daysAgo(3), instructions: "Want this to feel less generic — targeting Lumera and Atlas Pay." },
    // Open queue items from other candidates (what the demo expert can claim)
    { id: "rr-003", candidateId: "user-cand-3", serviceType: "resume_review", documentId: "doc-resume-cand3", status: "available", priceCents: 12900, createdAt: daysAgo(0.3), instructions: "Backend engineer targeting senior roles. Worried my impact isn't coming through." },
    { id: "rr-004", candidateId: "user-cand-4", serviceType: "resume_review", documentId: "doc-resume-cand4", status: "available", priceCents: 9900, createdAt: daysAgo(0.8), instructions: "Product designer, 6 yrs. Portfolio gets clicks but resume gets silence." },
    { id: "rr-005", candidateId: "user-cand-2", serviceType: "cover_letter_review", documentId: "doc-cover-cand2", status: "available", priceCents: 5900, createdAt: daysAgo(1.2), instructions: "PM cover letter for a data platform role. Be brutal." },
    // One currently claimed by the demo expert (in progress)
    { id: "rr-006", candidateId: "user-cand-3", serviceType: "linkedin_review", documentId: null, status: "claimed", claimedBy: DEMO_EXPERT_ID, claimedAt: daysAgo(0.1), lockExpiresAt: daysFromNow(1), priceCents: 8900, createdAt: daysAgo(1.5), instructions: "LinkedIn gets ~2 recruiter views/week. Help." },
  ]);

  await db.insert(schema.reviewFeedback).values([
    {
      id: "rf-001",
      reviewRequestId: "rr-001",
      expertId: "expert-03",
      summary:
        "Strong foundation — your impact metrics are excellent. But the ATS parse drops your skills section due to column formatting, and your summary buries the Next.js migration (your best hook) in sentence three. Fix those two things and this resume competes at the top of senior frontend pipelines.",
      scorecard: [
        { dimension: "ATS Compatibility", score: 7, note: "Two-column skills block fails Workday parse. Move to a single line." },
        { dimension: "Impact & Metrics", score: 9, note: "Excellent quantification throughout — keep this." },
        { dimension: "Narrative Clarity", score: 7, note: "Lead with the migration story; it's your differentiator." },
        { dimension: "Keyword Coverage", score: 8, note: "Add 'performance optimization' and 'accessibility' verbatim." },
      ],
      suggestions: [
        "Flatten skills into a single ATS-safe line under the summary",
        "Open the summary with the 4M-MAU Next.js migration result",
        "Add 'Performance Optimization' and 'Web Accessibility (WCAG 2.1)' keywords",
        "Cut the Harborview role to two bullets to keep one page",
        "Mirror exact title keywords from target postings ('Senior Frontend Engineer')",
      ],
      candidateRating: 5,
      candidateComment: "Worth every cent — response rate doubled in a week.",
      createdAt: daysAgo(8),
    },
    {
      id: "rf-002",
      reviewRequestId: "rr-002",
      expertId: DEMO_EXPERT_ID,
      summary:
        "Your letter reads like a capable engineer wrote it in ten minutes — because it does. The bones are good (the LCP stat is great), but it never mentions the company. I've drafted a structure that names their product, connects your migration story to their stack, and closes with a specific ask.",
      scorecard: [
        { dimension: "Personalization", score: 4, note: "No company-specific content at all." },
        { dimension: "Evidence", score: 8, note: "The 38% LCP stat is a strong anchor." },
        { dimension: "Voice", score: 7, note: "Confident without arrogance — keep the tone." },
      ],
      suggestions: [
        "Open with one sentence about why this company, written fresh each time",
        "Tie the Next.js migration to their public tech stack",
        "Replace the generic closer with a specific conversation ask",
      ],
      createdAt: daysAgo(0.5),
    },
  ]);

  /* Interviews — tied to pipeline apps in interview/final stages */
  const interviewApps = appRows.filter((a) => ["interview", "final_round", "offer"].includes(a.stage as string));
  await db.insert(schema.interviews).values([
    { id: "int-001", userId: DEMO_CANDIDATE_ID, applicationId: interviewApps[0]?.id, type: "technical", status: "scheduled", scheduledAt: daysFromNow(2.2), durationMinutes: 60, interviewer: "Panel — 2 senior engineers" },
    { id: "int-002", userId: DEMO_CANDIDATE_ID, applicationId: interviewApps[1]?.id, type: "behavioral", status: "scheduled", scheduledAt: daysFromNow(4.5), durationMinutes: 45, interviewer: "Hiring Manager" },
    { id: "int-003", userId: DEMO_CANDIDATE_ID, applicationId: interviewApps[2]?.id, type: "final", status: "scheduled", scheduledAt: daysFromNow(6.1), durationMinutes: 90, interviewer: "VP Engineering + CTO" },
    { id: "int-004", userId: DEMO_CANDIDATE_ID, applicationId: interviewApps[0]?.id, type: "phone_screen", status: "completed", scheduledAt: daysAgo(6), durationMinutes: 30, interviewer: "Recruiter", outcome: "Advanced to technical round" },
  ]);

  /* Mock interview sessions */
  await db.insert(schema.mockSessions).values([
    {
      id: "mock-001",
      userId: DEMO_CANDIDATE_ID,
      mode: "ai",
      focus: "behavioral",
      status: "completed",
      score: 71,
      scorecard: [
        { dimension: "Structure (STAR)", score: 7, note: "Good situation setup; results sometimes arrive late in the answer." },
        { dimension: "Specificity", score: 8, note: "Strong metrics in most stories." },
        { dimension: "Conciseness", score: 6, note: "Three answers exceeded 3 minutes — tighten to 90s." },
        { dimension: "Leadership Signals", score: 7, note: "Mentorship stories land well; add a conflict story." },
      ],
      transcript: [
        { role: "interviewer", content: "Tell me about a time you had to influence a decision without authority.", at: daysAgo(4).toISOString() },
        { role: "candidate", content: "At Driftline, our platform team planned a rewrite that would freeze product work for a quarter...", at: daysAgo(4).toISOString() },
      ],
      completedAt: daysAgo(4),
      createdAt: daysAgo(4),
    },
    {
      id: "mock-002",
      userId: DEMO_CANDIDATE_ID,
      mode: "human",
      expertId: "expert-08",
      focus: "system_design",
      targetCompany: "Lumera",
      status: "scheduled",
      scheduledAt: daysFromNow(1.3),
      createdAt: daysAgo(2),
    },
    {
      id: "mock-003",
      userId: DEMO_CANDIDATE_ID,
      mode: "ai",
      focus: "technical",
      status: "completed",
      score: 78,
      scorecard: [
        { dimension: "Problem Decomposition", score: 8, note: "Clear breakdown before coding." },
        { dimension: "Communication", score: 8, note: "Narrated trade-offs well." },
        { dimension: "Edge Cases", score: 7, note: "Missed empty-input handling initially." },
      ],
      transcript: [
        { role: "interviewer", content: "Let's design a rate limiter for a public API. Walk me through your approach.", at: daysAgo(9).toISOString() },
        { role: "candidate", content: "I'd start by clarifying requirements: per-user vs per-IP, burst tolerance...", at: daysAgo(9).toISOString() },
      ],
      completedAt: daysAgo(9),
      createdAt: daysAgo(9),
    },
  ]);

  /* Company interview kits for companies in the active pipeline */
  const kitCompanies = interviewApps
    .map((a) => jobs.find((j) => j.id === a.jobId))
    .filter(Boolean)
    .slice(0, 3);
  await db.insert(schema.interviewKits).values(
    kitCompanies.map((j, i) => ({
      id: `kit-${String(i + 1).padStart(2, "0")}`,
      company: j!.company!,
      role: j!.title!,
      overview: `${j!.company} runs a structured ${4 - (i % 2)}-stage loop for ${j!.title} candidates. Panels score against a written rubric; communication and ownership weigh as heavily as raw technical skill. Expect deep dives on past projects — interviewers are trained to push past surface-level answers.`,
      stages: [
        { name: "Recruiter Screen", description: "30 min — motivation, logistics, comp expectations.", tips: ["Have a tight 90-second career story", "Give a comp range, not a number", "Ask about the loop structure"] },
        { name: "Technical Deep Dive", description: "60 min — past work walkthrough plus live problem solving.", tips: ["Pick one project you can defend three levels deep", "Narrate trade-offs out loud", "Quantify everything"] },
        { name: "Team Panel", description: "2×45 min — collaboration, conflict, and craft.", tips: ["Prepare a real conflict story with a resolution you drove", "Ask each interviewer what great looks like in 6 months"] },
        { name: "Final Conversation", description: "45 min — values alignment with senior leadership.", tips: ["Connect your goals to their roadmap", "Close with a strong, specific question"] },
      ],
      questions: [
        { category: "Behavioral", question: "Tell me about a project where the initial approach failed.", guidance: "Show fast diagnosis, a decisive pivot, and a measured result. Own the mistake plainly." },
        { category: "Behavioral", question: "Describe a disagreement with a teammate about technical direction.", guidance: "They're testing collaboration under conflict — emphasize listening, data, and a clean resolution." },
        { category: "Technical", question: `How would you improve the performance of a slow ${(j!.skills as string[])[0]} application?`, guidance: "Structure it: measure → identify → fix → verify. Name specific profiling tools." },
        { category: "Role-specific", question: `What excites you about ${j!.company}'s product?`, guidance: "Reference something concrete — a feature, a launch, an engineering blog post." },
      ],
      values: ["Ownership", "Craftsmanship", "Customer obsession", "Speed with quality"],
    }))
  );

  /* Career health history — 8 weekly snapshots trending upward */
  const trend = [48, 51, 50, 56, 60, 63, 67, 71];
  await db.insert(schema.healthSnapshots).values(
    trend.map((score, i) => ({
      id: `health-${String(i + 1).padStart(2, "0")}`,
      userId: DEMO_CANDIDATE_ID,
      score,
      interviewProbability: Math.round(score * 0.82 + int(0, 6)),
      breakdown: [],
      createdAt: daysAgo((trend.length - 1 - i) * 7),
    }))
  );

  /* Copilot recommended actions */
  await db.insert(schema.copilotActions).values([
    { id: "act-001", userId: DEMO_CANDIDATE_ID, kind: "follow_up", title: "Send 2 overdue follow-ups", description: "Two applications have gone 5+ days without a response. A short, specific follow-up lifts reply rates ~30%.", impact: "+12% est. response rate", href: "/applications", priority: "critical", createdAt: daysAgo(0.2) },
    { id: "act-002", userId: DEMO_CANDIDATE_ID, kind: "interview_prep", title: "Prep for your technical interview in 2 days", description: "Your panel at the top of your pipeline is in ~48h. Run the company kit and one AI mock focused on system design.", impact: "+18% est. pass rate", href: "/interviews", priority: "critical", createdAt: daysAgo(0.2) },
    { id: "act-003", userId: DEMO_CANDIDATE_ID, kind: "apply", title: "Apply to 3 fresh high-probability roles", description: "Three roles posted in the last 48h score above 65% interview probability. Early applications get 3–4× more recruiter views.", impact: "+3 quality applications", href: "/opportunities", priority: "high", createdAt: daysAgo(0.4) },
    { id: "act-004", userId: DEMO_CANDIDATE_ID, kind: "review", title: "Accept Sarah Chen's cover letter feedback", description: "Your cover letter review was delivered. Apply the personalization fixes before your next two applications.", impact: "Unblocks 2 applications", href: "/experts", priority: "high", createdAt: daysAgo(0.5) },
    { id: "act-005", userId: DEMO_CANDIDATE_ID, kind: "skill", title: "Close your GraphQL gap signal", description: "GraphQL appears in 40% of your high-fit roles but is thin on your resume. Add your persisted-queries project to the skills narrative.", impact: "+6 pts avg match score", href: "/insights", priority: "medium", createdAt: daysAgo(1) },
  ]);

  /* Notifications */
  await db.insert(schema.notifications).values([
    { id: "ntf-001", userId: DEMO_CANDIDATE_ID, kind: "review", title: "Sarah Chen delivered your cover letter review", body: "3 scorecard dimensions, 3 suggested fixes.", href: "/experts", createdAt: daysAgo(0.5) },
    { id: "ntf-002", userId: DEMO_CANDIDATE_ID, kind: "interview", title: "Technical interview confirmed", body: "Panel interview scheduled — prep kit is ready.", href: "/interviews", createdAt: daysAgo(1) },
    { id: "ntf-003", userId: DEMO_CANDIDATE_ID, kind: "opportunity", title: "5 new high-probability matches", body: "New roles above 60% interview probability.", href: "/opportunities", createdAt: daysAgo(1.5), readAt: daysAgo(1) },
    { id: "ntf-004", userId: DEMO_EXPERT_USER_ID, kind: "queue", title: "3 reviews available in your queue", body: "Two resume reviews and one cover letter review match your specialties.", href: "/experts/queue", createdAt: daysAgo(0.3) },
  ]);

  /* Billing */
  await db.insert(schema.subscriptions).values([
    { id: "sub-001", userId: DEMO_CANDIDATE_ID, plan: "accelerator", status: "active", currentPeriodEnd: daysFromNow(19) },
  ]);
  await db.insert(schema.transactions).values([
    { id: "tx-001", userId: DEMO_CANDIDATE_ID, expertId: "expert-03", reviewRequestId: "rr-001", description: "Deep Resume Review — Emily Rodriguez", amountCents: 12900, platformFeeCents: 2580, status: "succeeded", createdAt: daysAgo(10) },
    { id: "tx-002", userId: DEMO_CANDIDATE_ID, expertId: DEMO_EXPERT_ID, reviewRequestId: "rr-002", description: "Cover Letter Review — Sarah Chen", amountCents: 5900, platformFeeCents: 1180, status: "succeeded", createdAt: daysAgo(3) },
    { id: "tx-003", userId: DEMO_CANDIDATE_ID, description: "Accelerator plan — monthly", amountCents: 4900, platformFeeCents: 0, status: "succeeded", createdAt: daysAgo(11) },
  ]);
}
