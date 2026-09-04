import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getAiConfigStatus } from "@/lib/ai-config-service";
import { AI_PROVIDER_LIST } from "@/lib/ai";
import { AiConfigForm } from "@/components/settings/ai-config-form";

export const metadata: Metadata = {
  title: "Settings — CourseForge",
};

export default async function SettingsPage() {
  const session = await auth();
  const status = await getAiConfigStatus(session!.user.id);

  const providers = AI_PROVIDER_LIST.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    apiKeyPlaceholder: p.apiKeyPlaceholder,
    modelPlaceholder: p.modelPlaceholder,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink">Settings</h1>

      <section className="mt-8">
        <h2 className="text-base font-medium text-ink">AI Configuration</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Connect your own AI provider to generate courses directly, without
          copying prompts by hand. This is entirely optional — CourseForge
          works fully without it via the external AI prompt flow.
        </p>
        <div className="mt-4">
          <AiConfigForm providers={providers} initialStatus={status} />
        </div>
        <p className="mt-3 text-xs text-steel-soft">
          Your API key is encrypted before it&apos;s stored and is never sent
          back to your browser once saved.
        </p>
      </section>
    </div>
  );
}
