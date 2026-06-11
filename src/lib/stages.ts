import type { ApplicationStage } from "@/db/schema";

export const STAGES: { id: ApplicationStage; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "preparing", label: "Preparing" },
  { id: "reviewed", label: "Reviewed" },
  { id: "applied", label: "Applied" },
  { id: "assessment", label: "Assessment" },
  { id: "interview", label: "Interview" },
  { id: "final_round", label: "Final Round" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
];
