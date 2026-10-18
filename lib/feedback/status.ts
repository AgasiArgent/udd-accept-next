// Copied from the user-driven-development kit (templates/scripts/udd/status.mjs, statusFromIssue).
const RULES: [string, string][] = [
  ["verified", "Verified in production"],
  ["needs-human", "Waiting for the developer"],
  ["shipped", "Shipped"],
  ["fix-ready", "Fix ready"],
  ["in-progress", "In progress"],
  ["approved", "Approved"],
  ["researched", "Looked into"],
];

export function statusFromIssue({
  labels = [],
  state,
  stateReason = null,
}: {
  labels?: string[];
  state?: string;
  stateReason?: string | null;
}) {
  if (state === "closed" && stateReason === "not_planned") return { key: "declined", text: "Declined" };
  for (const [key, text] of RULES) if (labels.includes(key)) return { key, text };
  if (state === "closed" && stateReason === "completed") return { key: "shipped", text: "Shipped" };
  return { key: "received", text: "Received" };
}
