import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { logout } from "@/lib/actions/auth";
import { listGamesAdmin } from "@/lib/data/admin";

export const metadata = { title: "Admin · PuzzleRiddler" };

async function NavGames() {
  await connection();
  const games = await listGamesAdmin();
  return (
    <>
      {games.map((g) => (
        <div key={g.id}>
          <div className="navlabel">{g.name}</div>
          <Link href={`/admin/games/${g.slug}/puzzles`}>Puzzles</Link>
          <Link href={`/admin/games/${g.slug}/categories`}>Categories</Link>
        </div>
      ))}
    </>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <Link className="brand" href="/admin">
          <span className="mark emoji">🧩</span>
          <span className="name">
            Puzzle<em>Admin</em>
          </span>
        </Link>
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/settings">Cache &amp; settings</Link>

        <Suspense fallback={<div className="navlabel">Loading…</div>}>
          <NavGames />
        </Suspense>

        <div className="spacer" />
        <Link href="/" style={{ fontSize: 13 }}>
          ← Back to site
        </Link>
        <form action={logout} style={{ marginTop: 6 }}>
          <button className="btn btn--ghost btn--block">Log out</button>
        </form>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
