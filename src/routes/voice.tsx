import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mic, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkVoiceStatus } from "@/lib/voice.functions";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice connection — Talkdraw" },
      {
        name: "description",
        content:
          "Check the ElevenLabs voice connection powering Talkdraw companions and see remaining speech credit.",
      },
      { property: "og:title", content: "Talkdraw voice connection" },
      {
        property: "og:description",
        content: "Connection status and speech credit for Talkdraw's ElevenLabs voice engine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const fetchStatus = useServerFn(checkVoiceStatus);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["voice-status"],
    queryFn: () => fetchStatus(),
    retry: false,
  });

  const connected = data?.connected === true;

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-primary">Voice</p>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
        Connect the <span className="text-gradient">voice engine</span>
      </h1>
      <p className="mt-5 text-muted-foreground">
        Talkdraw speaks through ElevenLabs. Once a voice key is linked to this project, every
        companion line is generated here with mood-aware delivery.
      </p>

      <section className="panel mt-10 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Mic className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">ElevenLabs</h2>
              {isFetching && !data ? (
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking the connection…
                </p>
              ) : error ? (
                <p className="mt-1 text-sm text-destructive">
                  {error instanceof Error ? error.message : "Could not read the voice status."}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{data?.message}</p>
              )}
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              connected
                ? "bg-primary/15 text-primary"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {connected ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5" />
            )}
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>

        {data?.connected ? (
          <dl className="mt-6 grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plan</dt>
              <dd className="mt-1 text-sm">{data.tier ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Credit left
              </dt>
              <dd className="mt-1 text-sm">
                {data.charactersRemaining !== undefined
                  ? `${data.charactersRemaining.toLocaleString()} characters`
                  : "Not readable"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Resets</dt>
              <dd className="mt-1 text-sm">
                {data.resetsAt ? new Date(data.resetsAt).toLocaleDateString() : "—"}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => refetch()} disabled={isFetching} size="sm">
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-check connection
          </Button>
          <p className="text-xs text-muted-foreground">
            The voice key lives in the project secrets as ELEVENLABS_API_KEY.
          </p>
        </div>
      </section>
    </main>
  );
}
