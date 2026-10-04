import { ok, fail } from "@/server/http";
import { insertRows, selectRows, updateRows } from "@/server/db/postgrest";
import { owned, upsert } from "@/server/db/rows";
import type { ProgressRow } from "@/server/db/rows";
import { DATE, isRecord, stringArray } from "@/domain/validation";
import type { ActionMap } from "@/server/progress/types";

export const voiceCheckinActions: ActionMap = {
  apply_voice_checkin: async ({ p, email }) => {
    const date = String(p.date ?? ""), c = p.checkin;
    if (!DATE.test(date) || !isRecord(c)) return fail("El cierre diario no es válido.");
    const clamp = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const previous = (await owned("daily_checkins", email, { entryDate: date }))[0] ?? {};
    const sleep = isRecord(c.sleep) ? c.sleep : {};
    const study = isRecord(c.study) ? c.study : {};
    const gym = isRecord(c.gym) ? c.gym : {};
    const reading = isRecord(c.reading) ? c.reading : {};
    const transcript = String(c.transcript ?? "");
    const normalized = transcript.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const mentions = (patterns: string[]) => patterns.some((pattern) => normalized.includes(pattern));
    const gymNo = mentions(["no fui al gimnasio", "no fui a entrenar", "no entrene", "no hice ejercicio", "no corri"]);
    const gymMentioned = !gymNo && (gym.attended === true || Boolean(String(gym.detail ?? "").trim()) || mentions(["gimnasio", "gym", "entrene", "entrenamiento", "pesas", "corrí", "corri", "running", "biciclet", "ciclismo", "natacion", "nadar", "futbol", "yoga", "pilates"]));
    const studyMentioned = Number(study.minutes) > 0 || Boolean(String(study.detail ?? "").trim()) || (Array.isArray(study.tasks) && study.tasks.length > 0) || mentions(["estudie", "estudié", "estudiar", "estudio", "trabaje", "trabajé", "trabajar", "trabajo"]);
    const sleepMentioned = Number(sleep.minutes) > 0 || Boolean(String(sleep.bedtime ?? "").trim()) || Boolean(String(sleep.wakeTime ?? "").trim()) || mentions(["dormi", "dormí", "duermo", "acoste", "acosté", "me levante", "me levanté", "sueno", "sueño"]);
    const waterMentioned = Number(c.waterMl) > 0 || mentions(["agua", "litro", "hidrat"]);
    const habits = Array.isArray(c.habits) ? c.habits.filter((value): value is string => typeof value === "string").slice(0, 12) : [];
    const habitsMentioned = habits.length > 0 || mentions(["habito", "hábito", "medite", "medité", "camine", "caminé", "stretch", "estir"]);
    const journal = String(c.journal ?? "").trim();
    const summary = String(c.summary ?? "").trim();
    const previousHabits = stringArray(previous.habitsJson);
    await upsert("daily_checkins", {
      userEmail: email,
      entryDate: date,
      habitsJson: JSON.stringify(habitsMentioned ? habits : previousHabits),
      workoutDetail: gymMentioned ? String(gym.detail ?? "").slice(0, 1500) : String(previous.workoutDetail ?? ""),
      studyMinutes: studyMentioned ? clamp(study.minutes, 1440) : clamp(previous.studyMinutes, 1440),
      studyDetail: studyMentioned ? String(study.detail ?? "").slice(0, 1500) : String(previous.studyDetail ?? ""),
      sleepMinutes: sleepMentioned ? clamp(sleep.minutes, 1440) : clamp(previous.sleepMinutes, 1440),
      bedtime: sleepMentioned ? String(sleep.bedtime ?? "").slice(0, 20) : String(previous.bedtime ?? ""),
      wakeTime: sleepMentioned ? String(sleep.wakeTime ?? "").slice(0, 20) : String(previous.wakeTime ?? ""),
      sleepQuality: previous.sleepQuality === "good" || previous.sleepQuality === "bad" ? previous.sleepQuality : null,
      waterMl: waterMentioned ? clamp(c.waterMl, 20000) : clamp(previous.waterMl, 20000),
      journal: journal || String(previous.journal ?? ""),
      transcript,
      voiceSummary: summary || String(previous.voiceSummary ?? ""),
    }, ["userEmail", "entryDate"]);

    for (const meal of Array.isArray(c.meals) ? c.meals.filter(isRecord).slice(0, 8) : []) {
      if (String(meal.name ?? "").trim()) {
        await insertRows("meals", {
          userEmail: email,
          mealDate: date,
          name: String(meal.name).slice(0, 80),
          detail: String(meal.detail ?? "").slice(0, 300),
          calories: clamp(meal.calories, 10000),
          protein: clamp(meal.protein, 1000),
          carbs: clamp(meal.carbs, 2000),
          fat: clamp(meal.fat, 1000),
        });
      }
    }

    if (gymMentioned) {
      const disciplines = await selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email }, order: [["createdAt", "asc"], ["id", "asc"]] });
      const normalizeName = (value: string) => value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matched = disciplines.filter((discipline) => normalized.includes(normalizeName(String(discipline.name))));
      const strength = disciplines.find((discipline) => discipline.kind === "strength");
      const selected = matched.length ? matched : strength ? [strength] : [];
      for (const discipline of selected) {
        await insertRows("training_logs", {
          userEmail: email,
          disciplineId: discipline.id,
          trainingDate: date,
          notes: String(gym.detail ?? "").slice(0, 1500),
        }, { upsert: true, onConflict: ["userEmail", "disciplineId", "trainingDate"], ignoreDuplicates: true });
      }
    }

    const readingTitle = String(reading.bookTitle ?? "").trim();
    const readingPages = Math.max(0, Math.min(5000, Math.round(Number(reading.pages) || 0)));
    if (readingPages > 0) {
      const books = await selectRows<ProgressRow>("books", { where: { userEmail: email }, order: [["createdAt", "desc"]] });
      const normalizedTitle = readingTitle.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const book = books.find((candidate) => normalizedTitle && normalizedTitle.includes(String(candidate.title).toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) || books.find((candidate) => candidate.status === "reading");
      if (book) {
        const previousLog = (await owned("reading_logs", email, { bookId: book.id, logDate: date }))[0];
        const currentPage = Math.max(0, book.totalPages ? Math.min(book.totalPages, book.currentPage + readingPages - (previousLog?.pages ?? 0)) : book.currentPage + readingPages);
        const completed = Number(book.totalPages) > 0 && currentPage >= Number(book.totalPages);
        await upsert("reading_logs", { userEmail: email, bookId: book.id, logDate: date, pages: readingPages, minutes: clamp(reading.minutes, 1440) }, ["userEmail", "bookId", "logDate"]);
        await updateRows("books", { id: book.id, userEmail: email }, { currentPage, status: completed ? "read" : "reading" });
      }
    }
    return ok();
  },
};
