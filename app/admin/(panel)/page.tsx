import { Suspense } from "react";
import { connection } from "next/server";
import { getDashboard } from "@/lib/data/analytics";

const ICON: Record<string, string> = { emoji: "🧩", dingbats: "🔤" };

async function DashboardBody() {
  await connection();
  const d = await getDashboard();
  const maxV = Math.max(1, ...d.last14.map((x) => x.visits));

  const tiles: [string, number][] = [
    ["Visits", d.totals.visit],
    ["Plays", d.totals.play],
    ["Solves", d.totals.solve],
    ["Reveals", d.totals.reveal],
  ];

  return (
    <>
      <div className="tiles">
        {tiles.map(([k, n]) => (
          <div className="card tile-stat" key={k}>
            <div className="n">{n.toLocaleString()}</div>
            <div className="k">{k}</div>
          </div>
        ))}
      </div>

      <section className="card" style={{ padding: 18 }}>
        <div className="label">Visits · last 14 days</div>
        <div className="bars">
          {d.last14.map((x) => (
            <div
              className="bar"
              key={x.day}
              title={`${x.day}: ${x.visits}`}
              style={{ height: `${(x.visits / maxV) * 100}%` }}
            />
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 18, marginTop: 14 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          Per game
        </div>
        {d.perGame.length === 0 ? (
          <p className="help">No plays recorded yet — play a round and refresh.</p>
        ) : (
          <table className="atable">
            <thead>
              <tr>
                <th>Game</th>
                <th>Plays</th>
                <th>Solves</th>
              </tr>
            </thead>
            <tbody>
              {d.perGame.map((g) => (
                <tr key={g.gameSlug}>
                  <td>
                    {ICON[g.gameSlug] ?? "🎲"} {g.gameSlug}
                  </td>
                  <td>{g.plays}</td>
                  <td>{g.solves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <h1>Dashboard</h1>
      <p className="help">Basic usage, counted in your own database — visits, plays, and puzzles solved.</p>
      <Suspense fallback={<p className="help">Loading…</p>}>
        <DashboardBody />
      </Suspense>
    </>
  );
}
