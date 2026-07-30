import { getGames } from "@/lib/data/games";
import { GameCard } from "@/components/home/GameCard";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export default async function Home() {
  const games = await getGames();

  return (
    <main className="container">
      <header className="site-header">
        <a className="brand" href="/">
          <span className="mark">🧩</span>
          <span className="name">
            Puzzle<em>Riddler</em>
          </span>
        </a>
        <ThemeSwitcher />
      </header>

      <section className="card hero">
        <p className="kicker">party puzzles for a room</p>
        <h1 className="display">
          Read the puzzle.
          <br />
          Shout the answer.
        </h1>
        <p className="lede">
          Put it on the big screen, split into teams, and let people yell it out. No slides to build,
          no scores to track on a whiteboard.
        </p>
        <div className="hero-demo">
          <span className="e emoji">🪙 🔫 🐴</span>
          <span className="arrow">→</span>
          <span className="ans">Sholay</span>
        </div>
      </section>

      <p className="section-label">Pick a game</p>
      <div className="games-grid">
        {games.map((g) => (
          <GameCard key={g.slug} game={g} />
        ))}
      </div>

      <footer className="site-foot">
        Three looks to choose from — try the switcher up top. More games, your own puzzle packs, and
        an admin studio are on the way.
      </footer>
    </main>
  );
}
