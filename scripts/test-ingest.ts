/**
 * Ingestion pipeline test with stubbed sources (sandbox-safe, no network).
 * Verifies: normalization, HTML stripping, salary parsing, upsert
 * idempotency, stale deactivation, and per-candidate scoring.
 */
process.env.INGEST_GREENHOUSE_BOARDS = "testco";
process.env.INGEST_LEVER_COMPANIES = "leverco";

const FIXTURES: Record<string, unknown> = {
  "boards-api.greenhouse.io": {
    jobs: [
      {
        id: 901,
        title: "Senior Backend Engineer",
        absolute_url: "https://boards.greenhouse.io/testco/jobs/901",
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        location: { name: "Remote - US" },
        content:
          "&lt;p&gt;Build APIs with &lt;b&gt;Go&lt;/b&gt; and PostgreSQL on Kubernetes.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;5+ years experience&lt;/li&gt;&lt;li&gt;AWS, Docker, gRPC&lt;/li&gt;&lt;/ul&gt;".replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
      },
      {
        id: 902,
        title: "Product Designer",
        absolute_url: "https://boards.greenhouse.io/testco/jobs/902",
        updated_at: new Date().toISOString(),
        location: { name: "New York, NY" },
        content: "<p>Figma, design systems, prototyping and user research for our flagship app.</p>",
      },
    ],
  },
  "api.lever.co": [
    {
      id: "ab-12",
      text: "Staff Frontend Engineer",
      hostedUrl: "https://jobs.lever.co/leverco/ab-12",
      createdAt: Date.now() - 3 * 86400000,
      categories: { location: "San Francisco, CA" },
      workplaceType: "remote",
      descriptionPlain: "React, TypeScript and Next.js. Design systems experience required. GraphQL a plus.",
      salaryRange: { min: 190000, max: 250000 },
    },
  ],
  "remotive.com": {
    jobs: [
      {
        id: 7001,
        title: "Full Stack Developer",
        company_name: "RemoteWorks",
        url: "https://remotive.com/jobs/7001",
        candidate_required_location: "Worldwide",
        salary: "$100,000 - $130,000",
        description: "<p>Node.js + React + PostgreSQL. Ship fast with CI/CD.</p>",
        publication_date: new Date(Date.now() - 2 * 86400000).toISOString(),
        tags: ["node.js", "react", "postgresql"],
      },
    ],
  },
  "www.arbeitnow.com": {
    data: [
      {
        slug: "ml-eng-berlin",
        title: "Machine Learning Engineer",
        company_name: "DeepBerlin",
        url: "https://arbeitnow.com/jobs/ml-eng-berlin",
        location: "Berlin",
        remote: false,
        description: "<p>PyTorch, Python, MLOps. LLM experience welcome.</p>",
        tags: [],
        created_at: Math.floor(Date.now() / 1000) - 5 * 86400,
      },
    ],
  },
};

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  const fixture = FIXTURES[url.hostname];
  if (fixture) {
    return new Response(JSON.stringify(fixture), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return realFetch(input);
}) as typeof fetch;

async function main() {
  const { ingestJobs } = await import("../src/lib/ingest");
  const { getDb, tables } = await import("../src/db");
  const { eq } = await import("drizzle-orm");

  // Run 1
  const r1 = await ingestJobs();
  console.log("run 1:", {
    fetched: r1.fetched,
    inserted: r1.inserted,
    updated: r1.updated,
    deactivated: r1.deactivated,
    matchesCreated: r1.matchesCreated,
    candidatesScored: r1.candidatesScored,
    sourcesOk: r1.sources.every((s) => s.ok),
  });
  if (r1.fetched !== 5 || r1.inserted !== 5) throw new Error("FAIL: expected 5 fetched+inserted");
  if (r1.matchesCreated < 5) throw new Error("FAIL: expected matches for candidates");

  // Spot-check normalization
  const db = await getDb();
  const [gh] = await db.select().from(tables.jobs).where(eq(tables.jobs.id, "gh-testco-901"));
  console.log("gh-testco-901:", {
    remote: gh.remote,
    seniority: gh.seniority,
    skills: gh.skills,
    htmlStripped: !gh.description.includes("<"),
  });
  if (!gh.remote || gh.seniority !== "senior" || (gh.skills as string[]).length < 3 || gh.description.includes("<"))
    throw new Error("FAIL: greenhouse normalization");
  const [rmtv] = await db.select().from(tables.jobs).where(eq(tables.jobs.id, "rmtv-7001"));
  if (rmtv.salaryMin !== 100000 || rmtv.salaryMax !== 130000) throw new Error("FAIL: salary parse");
  console.log("salary parse: PASS", rmtv.salaryMin, "-", rmtv.salaryMax);

  // Run 2: drop one greenhouse job → should deactivate it; everything else updates
  (FIXTURES["boards-api.greenhouse.io"] as { jobs: unknown[] }).jobs.pop();
  const r2 = await ingestJobs();
  console.log("run 2:", { inserted: r2.inserted, updated: r2.updated, deactivated: r2.deactivated, matchesCreated: r2.matchesCreated });
  if (r2.inserted !== 0 || r2.deactivated !== 1 || r2.matchesCreated !== 0)
    throw new Error("FAIL: idempotency/deactivation");
  const [gone] = await db.select().from(tables.jobs).where(eq(tables.jobs.id, "gh-testco-902"));
  if (gone.active) throw new Error("FAIL: stale job not deactivated");
  console.log("stale deactivation: PASS (gh-testco-902 inactive)");

  console.log("\nALL INGEST TESTS PASS");
  process.exit(0);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
