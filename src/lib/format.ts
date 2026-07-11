import { format, isToday, isYesterday } from "date-fns";

export function formatCrmDate(value?: string, includeTime = false) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  if (isToday(date)) return includeTime ? `Today ${format(date, "HH:mm")}` : "Today";
  if (isYesterday(date)) return includeTime ? `Yesterday ${format(date, "HH:mm")}` : "Yesterday";
  return format(date, includeTime ? "d MMM yyyy HH:mm" : "d MMM yyyy");
}
