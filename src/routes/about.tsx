import { createFileRoute } from "@tanstack/react-router";

const roadmap = [
  { phase: "Now", items: ["Character roster", "Accounts & dashboard", "Companion profiles"] },
  { phase: "Next", items: ["Understanding & conversation", "Emotional expression", "Movement"] },
  { phase: "Later", items: ["Voice", "Camera awareness", "Long-term memory"] },
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Talkdraw — The interactive anime companion platform" },
      {
        name: "description",
        content:
          "Talkdraw is building expressive 2D anime companions that listen, speak, move and remember. See what we're shipping next.",
      },
      { property: "og:title", content: "About Talkdraw" },
      {
        property: "og:description",
        content: "The roadmap behind Talkdraw's interactive anime companions.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-primary">About</p>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
        Companions built to <span className="text-gradient">feel present</span>
      </h1>
      <p className="mt-5 text-muted-foreground">
        Talkdraw is a home for interactive 2D anime characters. We start with craft — art
        direction, personality writing and a foundation that scales — then layer on the
        capabilities that make a companion feel alive.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {roadmap.map((stage) => (
          <section key={stage.phase} className="panel rounded-2xl p-6">
            <h2 className="font-display text-sm uppercase tracking-[0.2em] text-accent">
              {stage.phase}
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {stage.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
