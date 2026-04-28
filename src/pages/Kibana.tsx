import { ExternalLink, AlertTriangle } from "lucide-react";
import { getConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";

export default function Kibana() {
  const cfg = getConfig();
  const { user } = useAuth();
  const url = cfg.kibanaUrl;
  const allowed = !!user;
  const canEmbed = cfg.enableKibanaEmbed && url;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kibana Dashboard</h1>
          <p className="text-sm text-muted-foreground">Investigate raw indexed traffic and pre-built visualizations.</p>
        </div>
        {url && (
          <Button asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Open in new tab
            </a>
          </Button>
        )}
      </div>

      {!url ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
          <div>
            <p className="font-medium text-warning">Kibana URL is not configured</p>
            <p className="mt-1 text-xs text-muted-foreground">Set <span className="font-mono">VITE_KIBANA_URL</span> in your environment file or via <span className="font-mono">Settings</span>.</p>
          </div>
        </div>
      ) : !allowed ? (
        <p className="text-sm text-muted-foreground">You must be signed in to access Kibana.</p>
      ) : canEmbed ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <iframe
            title="Kibana"
            src={url}
            className="h-[78vh] w-full"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
          <div className="border-t border-border bg-secondary/40 px-4 py-2 text-[11px] text-muted-foreground">
            If the embed appears blank, your Kibana instance likely blocks framing for auth/CORS reasons. Use the “Open in new tab” button above.
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm">Embedding disabled. Open Kibana in a secure tab.</p>
          <Button asChild className="mt-4">
            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open Kibana</a>
          </Button>
        </div>
      )}
    </div>
  );
}
