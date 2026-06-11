import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, tables } from "@/db";
import { requireUser } from "@/lib/session";
import {
  completeCandidateOnboarding,
  completeExpertOnboarding,
} from "@/app/auth-actions";
import {
  Button,
  Card,
  CardContent,
  Input,
  Textarea,
} from "@/components/ui/primitives";

export const metadata = { title: "Set up your radar" };

const EXPERT_CATEGORIES = [
  { id: "resume_expert", label: "Resume Expert" },
  { id: "ats_expert", label: "ATS Expert" },
  { id: "recruiter", label: "Recruiter" },
  { id: "hiring_manager", label: "Hiring Manager" },
  { id: "interview_coach", label: "Interview Coach" },
  { id: "career_coach", label: "Career Coach" },
  { id: "executive_advisor", label: "Executive Advisor" },
];

export default async function OnboardingPage() {
  const user = await requireUser();
  const db = await getDb();

  if (user.role === "expert") {
    const [existing] = await db
      .select()
      .from(tables.experts)
      .where(eq(tables.experts.userId, user.id));
    if (existing) redirect("/experts/queue");

    return (
      <div className="mx-auto max-w-xl animate-fade-up">
        <h1 className="text-xl font-bold tracking-tight">Set up your expert profile</h1>
        <p className="mt-1 text-sm text-ink-muted">
          This is what candidates see in the marketplace. You can refine everything later.
        </p>
        <Card className="mt-4">
          <CardContent className="p-5">
            <form action={completeExpertOnboarding} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Headline</label>
                <Input
                  name="headline"
                  required
                  placeholder="e.g. Ex-Google Senior Recruiter · 9,000+ resumes reviewed"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Bio</label>
                <Textarea
                  name="bio"
                  rows={3}
                  required
                  placeholder="What's your background, and why should a candidate trust your eye?"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Years of industry experience
                </label>
                <Input name="yearsExperience" type="number" min={0} max={50} defaultValue={5} className="w-28" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Categories</label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {EXPERT_CATEGORIES.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-edge-strong bg-surface-2 px-2.5 py-2 text-xs has-[:checked]:border-violet/50 has-[:checked]:bg-violet-soft"
                    >
                      <input type="checkbox" name="categories" value={c.id} className="accent-[var(--color-violet)]" />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Specializations (comma-separated)
                </label>
                <Input name="specializations" placeholder="e.g. System Design, FAANG Loops, Salary Negotiation" />
              </div>
              <Button type="submit" className="w-full">
                Open my review queue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Candidate
  const [profile] = await db
    .select()
    .from(tables.candidateProfiles)
    .where(eq(tables.candidateProfiles.userId, user.id));
  if (profile) redirect("/");

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <h1 className="text-xl font-bold tracking-tight">
        Let&apos;s light up your radar, {user.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Two minutes of input → every opportunity scored with your personal interview probability.
      </p>
      <Card className="mt-4">
        <CardContent className="p-5">
          <form action={completeCandidateOnboarding} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Headline</label>
              <Input
                name="headline"
                required
                placeholder="e.g. Senior Frontend Engineer · React / TypeScript"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Years of experience
                </label>
                <Input name="yearsExperience" type="number" min={0} max={50} defaultValue={3} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Location</label>
                <Input name="location" placeholder="e.g. Austin, TX (remote ok)" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Your skills (comma-separated) — these drive your match scores
              </label>
              <Textarea
                name="skills"
                rows={2}
                required
                placeholder="e.g. React, TypeScript, Node.js, PostgreSQL, AWS"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Target roles (comma-separated)
              </label>
              <Input name="targetRoles" required placeholder="e.g. Senior Frontend Engineer, Full Stack Engineer" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Paste your resume (optional but recommended — unlocks tailoring & ATS scoring)
              </label>
              <Textarea name="resume" rows={6} placeholder="Paste the full text of your current resume…" />
            </div>
            <Button type="submit" className="w-full">
              Activate my radar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
