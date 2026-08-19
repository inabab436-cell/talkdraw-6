import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { characters } from "@/lib/characters";
import { CharacterScene } from "@/components/character-scene";

export const Route = createFileRoute("/scene")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Touch Scene — Talkdraw anime companions" },
      {
        name: "description",
        content:
          "Touch a Talkdraw anime companion directly in the scene and watch AI decide how they move, feel and reply.",
      },
      { property: "og:title", content: "Talkdraw Touch Scene" },
      {
        property: "og:description",
        content: "Tap, hold or swipe your companion — the AI reads the context and reacts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScenePage,
});

function ScenePage() {
  const { id } = Route.useSearch();
  const character = characters.find((c) => c.id === id) ?? characters[0]!;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs uppercase tracking-[0.35em] text-primary">Touch scene</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
        Touch <span className="text-gradient">{character.name}</span> directly
      </h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Every touch sends its position, region, type, duration and repetition to the AI, which
        decides the motion, expression, emotion shift and line of speech.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {characters.map((c) => (
          <Link
            key={c.id}
            to="/scene"
            search={{ id: c.id }}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              c.id === character.id
                ? "border-primary/70 bg-primary/15 text-foreground"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <CharacterScene key={character.id} character={character} />
      </div>
    </main>
  );
}
