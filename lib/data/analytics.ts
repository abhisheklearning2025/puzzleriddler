import "server-only";

export type Metric = "visit" | "play" | "solve" | "reveal";
const METRICS: Metric[] = ["visit", "play", "solve", "reveal"];

export function isMetric(x: unknown): x is Metric {
  return typeof x === "string" && (METRICS as string[]).includes(x);
}

function todayUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** One atomic upsert-with-increment per event — O(1), bounded row growth. */
export async function recordEvent(metric: Metric, gameSlug = ""): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const { prisma } = await import("@/lib/db");
  const day = todayUTC();
  await prisma.dailyStat.upsert({
    where: { day_metric_gameSlug: { day, metric, gameSlug } },
    update: { count: { increment: 1 } },
    create: { day, metric, gameSlug, count: 1 },
  });
}

export type Dashboard = {
  totals: Record<Metric, number>;
  perGame: { gameSlug: string; plays: number; solves: number }[];
  last14: { day: string; visits: number }[];
};

export async function getDashboard(): Promise<Dashboard> {
  const empty: Dashboard = {
    totals: { visit: 0, play: 0, solve: 0, reveal: 0 },
    perGame: [],
    last14: [],
  };
  if (!process.env.DATABASE_URL) return empty;

  const { prisma } = await import("@/lib/db");
  const rows = await prisma.dailyStat.findMany();

  const totals: Record<Metric, number> = { visit: 0, play: 0, solve: 0, reveal: 0 };
  const plays: Record<string, number> = {};
  const solves: Record<string, number> = {};
  const visitsByDay: Record<string, number> = {};

  for (const r of rows) {
    if (isMetric(r.metric)) totals[r.metric] += r.count;
    if (r.metric === "play" && r.gameSlug) plays[r.gameSlug] = (plays[r.gameSlug] ?? 0) + r.count;
    if (r.metric === "solve" && r.gameSlug) solves[r.gameSlug] = (solves[r.gameSlug] ?? 0) + r.count;
    if (r.metric === "visit") {
      const k = r.day.toISOString().slice(0, 10);
      visitsByDay[k] = (visitsByDay[k] ?? 0) + r.count;
    }
  }

  const gameSlugs = [...new Set([...Object.keys(plays), ...Object.keys(solves)])].sort();
  const perGame = gameSlugs.map((gameSlug) => ({
    gameSlug,
    plays: plays[gameSlug] ?? 0,
    solves: solves[gameSlug] ?? 0,
  }));

  const last14: { day: string; visits: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    last14.push({ day: k, visits: visitsByDay[k] ?? 0 });
  }

  return { totals, perGame, last14 };
}
