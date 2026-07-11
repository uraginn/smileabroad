import type { ConditionType } from "../types/dental-plan.types";
export function applyCondition(
  existing: ConditionType[],
  incoming: ConditionType,
): ConditionType[] {
  if (incoming === "healthy") return ["healthy"];
  let next = existing.filter((condition) => condition !== "healthy");
  const structural: ConditionType[] = [
    "existing-crown",
    "existing-implant",
    "existing-filling",
    "existing-bridge",
    "root-canal-treated",
    "decay",
    "fractured",
  ];
  if (incoming === "missing")
    next = next.filter(
      (condition) => !structural.includes(condition) && condition !== "extraction-required",
    );
  if (structural.includes(incoming) || incoming === "extraction-required")
    next = next.filter((condition) => condition !== "missing");
  if (incoming === "existing-implant")
    next = next.filter(
      (condition) =>
        !["existing-crown", "existing-filling", "decay", "root-canal-treated"].includes(condition),
    );
  if (!next.includes(incoming)) next.push(incoming);
  return next;
}
export const removeCondition = (existing: ConditionType[], target: ConditionType) =>
  existing.filter((condition) => condition !== target);
