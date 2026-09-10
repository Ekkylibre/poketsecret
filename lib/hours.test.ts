import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dayLabels, formatDayHours, getTodayWeekday, parseHoursFromFormData, weekdayOrder } from "./hours";

describe("weekdayOrder / dayLabels", () => {
  it("liste les 7 jours, dans l'ordre, chacun avec un libellé", () => {
    expect(weekdayOrder).toHaveLength(7);
    for (const day of weekdayOrder) {
      expect(dayLabels[day]).toBeTruthy();
    }
  });
});

describe("getTodayWeekday", () => {
  afterEach(() => vi.useRealTimers());

  it("fait correspondre le dimanche JS (0) à 'dimanche'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T10:00:00")); // un dimanche
    expect(getTodayWeekday()).toBe("dimanche");
  });

  it("fait correspondre le lundi JS (1) à 'lundi'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00")); // un lundi
    expect(getTodayWeekday()).toBe("lundi");
  });
});

describe("formatDayHours", () => {
  it("affiche Fermé pour un jour marqué fermé", () => {
    expect(formatDayHours({ closed: true })).toBe("Fermé");
  });

  it("affiche Fermé pour un jour sans aucun créneau renseigné", () => {
    expect(formatDayHours({})).toBe("Fermé");
  });

  it("affiche un seul créneau matin", () => {
    expect(formatDayHours({ morningOpen: "09:00", morningClose: "12:00" })).toBe("09:00–12:00");
  });

  it("affiche matin et après-midi séparés par une barre", () => {
    expect(
      formatDayHours({
        morningOpen: "09:00",
        morningClose: "12:00",
        afternoonOpen: "14:00",
        afternoonClose: "18:00",
      })
    ).toBe("09:00–12:00 / 14:00–18:00");
  });

  it("ignore un créneau incomplet (ouverture sans fermeture)", () => {
    expect(formatDayHours({ morningOpen: "09:00" })).toBe("Fermé");
  });
});

describe("parseHoursFromFormData", () => {
  function buildFormData(fields: Record<string, string>): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    return formData;
  }

  beforeEach(() => {
    // FormData est global côté navigateur ; en environnement Node (test), il faut
    // s'assurer que l'implémentation native est bien disponible (Node 18+ l'expose).
  });

  it("marque un jour fermé quand la case 'closed' est cochée", () => {
    const hours = parseHoursFromFormData(buildFormData({ hours_lundi_closed: "on" }));
    expect(hours.lundi).toEqual({ closed: true });
  });

  it("reconstruit les créneaux d'un jour ouvert", () => {
    const hours = parseHoursFromFormData(
      buildFormData({
        hours_mardi_morningOpen: "09:00",
        hours_mardi_morningClose: "12:00",
      })
    );
    expect(hours.mardi).toEqual({
      morningOpen: "09:00",
      morningClose: "12:00",
      afternoonOpen: undefined,
      afternoonClose: undefined,
    });
  });

  it("omet complètement un jour sans aucun champ renseigné", () => {
    const hours = parseHoursFromFormData(buildFormData({ hours_lundi_closed: "on" }));
    expect(hours.mercredi).toBeUndefined();
  });
});
