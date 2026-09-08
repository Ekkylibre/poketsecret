import type { DayHours, StoreHours, Weekday } from "@/lib/types";

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

/** Reconstruit les horaires d'un magasin à partir des champs `hours_<jour>_*` d'un
 *  formulaire (nouveau-magasin-dialog) — utilisé côté serveur et pour l'aperçu client. */
export function parseHoursFromFormData(formData: FormData): StoreHours {
  const hours: StoreHours = {};
  for (const day of weekdayOrder) {
    const closed = formData.get(`hours_${day}_closed`) === "on";
    const morningOpen = (formData.get(`hours_${day}_morningOpen`) as string) || undefined;
    const morningClose = (formData.get(`hours_${day}_morningClose`) as string) || undefined;
    const afternoonOpen = (formData.get(`hours_${day}_afternoonOpen`) as string) || undefined;
    const afternoonClose = (formData.get(`hours_${day}_afternoonClose`) as string) || undefined;

    if (closed) {
      hours[day] = { closed: true };
      continue;
    }

    const dayHours: DayHours = { morningOpen, morningClose, afternoonOpen, afternoonClose };
    if (Object.values(dayHours).some(Boolean)) hours[day] = dayHours;
  }
  return hours;
}

export function formatDayHours(day: DayHours) {
  if (day.closed) return "Fermé";

  const sessions = [
    day.morningOpen && day.morningClose ? `${day.morningOpen}–${day.morningClose}` : null,
    day.afternoonOpen && day.afternoonClose ? `${day.afternoonOpen}–${day.afternoonClose}` : null,
  ].filter((session): session is string => session != null);

  return sessions.length > 0 ? sessions.join(" / ") : "Fermé";
}
