import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { characters } from "@/lib/characters";

export const Route = createFileRoute("/characters")({
  head: () => ({
    meta: [
      { title: "Talkdraw Characters — Meet the anime companions" },
      {
        name: "description",
        content:
          "Browse the Talkdraw roster of 2D anime companions, each with a distinct personality, voice and story.",
      },
      { property: "og:title", content: "Talkdraw Characters" },
      {
        property: "og:description",
        content: "Meet the 2D anime companions waiting inside Talkdraw.",
      },
    ],
  }),
  component: CharactersPage,
});

function CharactersPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-primary">The roster</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-bold sm:text-5xl">
        Four companions. <span className="text-gradient">Four personalities.</span>
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Every character is hand-designed with their own temperament and way of speaking. Pick the
        one you connect with — more join the roster over time.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {characters.map((character) => (
          <article
            key={character.id}
            className="panel group overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <Link to="/scene" search={{ id: character.id }} aria-label={`Enter ${character.name}'s scene`}>
                <img
                  src={character.image}
                  alt={`${character.name}, ${character.title} anime character`}
                  loading="lazy"
                  width={768}
                  height={1024}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
            </div>
            <div className="p-5">
              <h2 className="font-display text-xl font-bold">{character.name}</h2>
              <p className="text-sm text-accent">{character.title}</p>
              <p className="mt-3 text-sm text-muted-foreground">{character.tagline}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {character.traits.map((trait) => (
                  <li
                    key={trait}
                    className="rounded-full border border-border/70 bg-secondary/60 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {trait}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-5 w-full">
                <Link to="/scene" search={{ id: character.id }}>
                  Enter {character.name}'s scene
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-14 flex justify-center">
        <Button asChild size="lg">
          <Link to="/auth" search={{ mode: "signup" }}>
            Create your account
          </Link>
        </Button>
      </div>
    </main>
  );
}
