import type { DayHours, Weekday } from "@/lib/types";

export const dayLabels: Record<Weekday, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
};

export const weekdayOrder: Weekday[] = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

const weekdayByJsDay: Weekday[] = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

export function getTodayWeekday(): Weekday {
  return weekdayByJsDay[new Date().getDay()];
}

export function formatDayHours(day: DayHours) {
  if (day.closed) return "Fermé";

  const sessions = [
    day.morningOpen && day.morningClose ? `${day.morningOpen}–${day.morningClose}` : null,
    day.afternoonOpen && day.afternoonClose ? `${day.afternoonOpen}–${day.afternoonClose}` : null,
  ].filter((session): session is string => session != null);

  return sessions.length > 0 ? sessions.join(" / ") : "Fermé";
}
