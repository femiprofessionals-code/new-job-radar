/**
 * Shared normalization for job ingestion: skill extraction, seniority
 * inference, and the normalized job shape every source maps into.
 */

export interface NormalizedJob {
  id: string; // globally unique, source-prefixed (e.g. "gh-stripe-123")
  title: string;
  company: string;
  companyDomain: string | null;
  location: string;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  requirements: string[];
  skills: string[];
  seniority: string;
  url: string | null;
  source: string;
  applicantEstimate: number | null;
  postedAt: Date;
  active: boolean;
}

export const SKILL_LEXICON = [
  "React", "TypeScript", "JavaScript", "Next.js", "Vue.js", "Angular", "Svelte",
  "Node.js", "Python", "Django", "Flask", "FastAPI", "Java", "Spring Boot", "Kotlin",
  "Go", "Rust", "Ruby", "Rails", "PHP", "Laravel", "C#", ".NET", "C++", "Swift",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "GraphQL", "REST APIs", "gRPC",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux",
  "Tailwind CSS", "CSS", "HTML", "Sass", "Webpack", "Vite", "Design Systems",
  "Figma", "Sketch", "Prototyping", "User Research", "Interaction Design", "Accessibility",
  "Product Strategy", "Roadmapping", "A/B Testing", "Agile", "Scrum", "Stakeholder Management",
  "SQL", "dbt", "Airflow", "Snowflake", "Spark", "Pandas", "PyTorch", "TensorFlow",
  "Machine Learning", "MLOps", "LLM", "Data Modeling", "ETL", "Tableau", "Looker",
  "System Design", "Microservices", "Observability", "Performance Optimization",
  "Testing Library", "Jest", "Cypress", "Playwright", "Salesforce", "Stripe",
];

export function extractSkills(text: string): string[] {
  const hay = ` ${text.toLowerCase().replace(/[\n\r\t]/g, " ")} `;
  return SKILL_LEXICON.filter((s) => {
    const n = s.toLowerCase();
    return (
      hay.includes(` ${n} `) || hay.includes(` ${n},`) || hay.includes(` ${n}.`) ||
      hay.includes(`(${n}`) || hay.includes(` ${n})`) || hay.includes(` ${n}/`) ||
      hay.includes(`/${n} `) || hay.includes(` ${n};`) || hay.includes(`,${n},`) ||
      hay.includes(`,${n} `) || hay.includes(` ${n}:`)
    );
  }).slice(0, 10);
}

export function inferSeniority(title: string, raw?: string | null): string {
  const t = `${raw ?? ""} ${title}`.toLowerCase();
  if (/principal/.test(t)) return "principal";
  if (/staff/.test(t)) return "staff";
  if (/director|head of/.test(t)) return "director";
  if (/\blead\b/.test(t)) return "lead";
  if (/senior|sr\.?\b/.test(t)) return "senior";
  if (/junior|jr\.?\b|entry|intern|graduate/.test(t)) return "junior";
  return "mid";
}

/** Strip HTML to plain text (job APIs return HTML descriptions). */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export function slugDomain(company: string): string | null {
  const slug = company.toLowerCase().replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : null;
}
