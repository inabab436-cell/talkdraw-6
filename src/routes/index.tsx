import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Mic, Camera, Brain, Sparkles, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { characters } from "@/lib/characters";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Talkdraw — Interactive 2D anime companions" },
      {
        name: "description",
        content:
          "Talkdraw brings intelligent 2D anime characters to life. Choose a companion, build a bond, and grow with them as they learn to listen, speak and move.",
      },
      { property: "og:title", content: "Talkdraw — Interactive 2D anime companions" },
      {
        property: "og:description",
        content: "Choose an anime companion and build a bond that grows over time.",
      },
    ],
  }),
  component: Index,
});

const capabilities = [
  { icon: MessageCircle, title: "Understand you", text: "Reads context, tone and intent." },
  { icon: Mic, title: "Listen & speak", text: "Natural voice in both directions." },
  { icon: Move, title: "Move", text: "Living 2D motion, not static art." },
  { icon: Sparkles, title: "Express emotion", text: "Reactions that match the moment." },
  { icon: Camera, title: "See with permission", text: "Camera awareness, only if you allow it." },
  { icon: Brain, title: "Remember", text: "Keeps what matters, forgets what doesn't." },
];

function Index() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Anime hero standing above a neon-lit futuristic city at night"
          width={1600}
          height={1008}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 grid-veil" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl px-5 py-24 sm:py-32">
          <p className="text-xs uppercase tracking-[0.35em] text-primary">Talkdraw</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.05] sm:text-6xl">
            Anime companions that <span className="text-gradient">talk back</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Pick a hand-drawn 2D character with a personality of their own. Talkdraw is the
            foundation — soon they will listen, speak, move and remember.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Claim early access
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/characters">Meet the characters</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">The roster</h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              Distinct personalities, drawn in a luxury futuristic style.
            </p>
          </div>
          <Link to="/characters" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {characters.map((character) => (
            <article
              key={character.id}
              className="panel group overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <Link to="/scene" search={{ id: character.id }} aria-label={`Enter ${character.name}'s scene`}>
                  <img
                    src={character.image}
                    alt={`${character.name}, ${character.title}`}
                    loading="lazy"
                    width={768}
                    height={1024}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-bold">{character.name}</h3>
                <p className="text-xs text-accent">{character.title}</p>
                <Button asChild size="sm" className="mt-4 w-full">
                  <Link to="/scene" search={{ id: character.id }}>
                    Enter scene
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold sm:text-4xl">What they will become</h2>
          <p className="mt-2 max-w-lg text-muted-foreground">
            The groundwork is live today. These capabilities arrive stage by stage.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cap) => (
              <div key={cap.title} className="panel rounded-2xl p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <cap.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{cap.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{cap.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="panel glow-ring rounded-3xl px-6 py-14 text-center sm:px-14">
          <h2 className="text-3xl font-bold sm:text-4xl">Be there from the first line</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Create an account now and your companion will be waiting when conversation goes live.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create your account
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
