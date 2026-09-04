"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ProviderOption {
  id: string;
  displayName: string;
  apiKeyPlaceholder: string;
  modelPlaceholder: string;
}

interface AiConfigStatus {
  configured: boolean;
  provider?: string;
  providerName?: string;
  model?: string;
}

export function AiConfigForm({
  providers,
  initialStatus,
}: {
  providers: ProviderOption[];
  initialStatus: AiConfigStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isEditing, setIsEditing] = useState(!initialStatus.configured);

  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const selectedProvider = providers.find((p) => p.id === providerId);

  async function handleTest() {
    setTestState("testing");
    setTestError(null);

    const response = await fetch("/api/ai-config/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerId,
        model,
        // Only send a key if the user actually typed one — otherwise
        // the server tests the already-saved key for this provider.
        ...(apiKey ? { apiKey } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setTestState("error");
      setTestError(body?.error ?? "Connection test failed.");
      return;
    }

    setTestState("ok");
  }

  async function handleSave() {
    setSaveError(null);
    setIsSaving(true);

    const response = await fetch("/api/ai-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerId, apiKey, model }),
    });

    const body = await response.json().catch(() => null);
    setIsSaving(false);

    if (!response.ok) {
      setSaveError(body?.error ?? "Couldn't save this configuration.");
      return;
    }

    setStatus(body);
    setIsEditing(false);
    setApiKey("");
    router.refresh();
  }

  async function handleRemove() {
    if (!confirm("Remove your AI configuration? Direct generation will be unavailable until you add a new one.")) {
      return;
    }
    setIsRemoving(true);
    const response = await fetch("/api/ai-config", { method: "DELETE" });
    setIsRemoving(false);

    if (!response.ok) {
      alert("Couldn't remove the configuration. Please try again.");
      return;
    }

    setStatus({ configured: false });
    setIsEditing(true);
    setApiKey("");
    setModel("");
    router.refresh();
  }

  if (status.configured && !isEditing) {
    return (
      <div className="rounded-lg border border-line bg-paper-raised p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">{status.providerName}</p>
            <p className="mt-1 text-sm text-steel-soft">Model: {status.model}</p>
          </div>
          <Badge tone="green">✓ Configured</Badge>
        </div>
        <p className="mt-3 font-mono text-sm tracking-widest text-steel-soft">
          ••••••••••••••••
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            Replace
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft hover:text-danger"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            {isRemoving ? "Removing…" : "Remove"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-paper-raised p-5">
      <div className="space-y-1.5">
        <Label htmlFor="provider">Provider</Label>
        <select
          id="provider"
          value={providerId}
          onChange={(e) => {
            setProviderId(e.target.value);
            setTestState("idle");
          }}
          className="h-10 w-full rounded-md border border-line-strong bg-paper-raised px-3 text-sm text-ink"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          type="password"
          autoComplete="off"
          placeholder={selectedProvider?.apiKeyPlaceholder}
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setTestState("idle");
          }}
        />
        {status.configured && (
          <p className="text-xs text-steel-soft">
            Leave blank to keep testing your currently saved key.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          placeholder={selectedProvider?.modelPlaceholder}
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setTestState("idle");
          }}
        />
      </div>

      {testState === "ok" && (
        <p className="mt-3 text-sm text-forge-green">✓ Connection works.</p>
      )}
      {testState === "error" && (
        <p className="mt-3 text-sm text-danger">{testError}</p>
      )}
      {saveError && <p className="mt-3 text-sm text-danger">{saveError}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleTest}
          disabled={testState === "testing" || !model || (!apiKey && !status.configured)}
        >
          {testState === "testing" ? "Testing…" : "Test Connection"}
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !apiKey || !model}
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
        {status.configured && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
