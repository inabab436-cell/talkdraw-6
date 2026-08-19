import { useEffect } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, Sparkles, Brain, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { characters } from "@/lib/characters";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Talkdraw dashboard" },
      {
        name: "description",
        content: "Manage your Talkdraw profile and choose the anime companion you want to meet.",
      },
      { property: "og:title", content: "Your Talkdraw dashboard" },
      {
        property: "og:description",
        content: "Your companions, your profile, all in one place.",
      },
    ],
  }),
  component: DashboardPage,
});

const upcoming = [
  { icon: MessageCircle, label: "Conversation", note: "Understanding and replies" },
  { icon: Mic, label: "Voice", note: "Listening and speaking" },
  { icon: Sparkles, label: "Expression", note: "Motion and emotion" },
  { icon: Brain, label: "Memory", note: "Remembering what matters" },
];

function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading || !user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "there";

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="panel flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Dashboard</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Welcome back, {name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" onClick={() => signOut().then(() => router.navigate({ to: "/" }))}>
          Sign out
        </Button>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Your companions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a character, enter their scene, and touch them to get an AI voice response.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {characters.map((character) => (
            <article key={character.id} className="panel overflow-hidden rounded-2xl">
              <Link
                to="/scene"
                search={{ id: character.id }}
                aria-label={`Enter ${character.name}'s scene`}
              >
                <img
                  src={character.image}
                  alt={`${character.name}, ${character.title}`}
                  loading="lazy"
                  width={768}
                  height={1024}
                  className="aspect-[3/4] w-full object-cover"
                />
              </Link>
              <div className="p-4">
                <h3 className="font-display font-bold">{character.name}</h3>
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

      <section className="mt-12">
        <h2 className="text-lg font-semibold">On the way</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((item) => (
            <div key={item.label} className="panel rounded-xl p-5">
              <item.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <Button asChild variant="ghost">
          <Link to="/characters">Browse the full roster</Link>
        </Button>
      </div>
    </main>
  );
}
