import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RecordCard } from "@/components/public/record-card";
import { PublicShell } from "@/components/public/shell";
import { StatusCard } from "@/components/public/status-card";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ResolveResult } from "@/lib/types";
import { normalizeCode } from "@/lib/utils";

// Setiap scan harus dihitung dan (untuk mode redirect) menghasilkan HTTP redirect sungguhan.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hasil scan",
  robots: { index: false, follow: false },
};

function hashIp(ip: string) {
  const salt = process.env.SCAN_HASH_SALT ?? "tandai";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export default async function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(decodeURIComponent(rawCode));

  if (!isSupabaseConfigured) {
    return (
      <PublicShell>
        <SetupNotice />
      </PublicShell>
    );
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_code", {
    p_code: code,
    p_user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
    p_referrer: h.get("referer")?.slice(0, 300) ?? null,
    p_ip_hash: ip ? hashIp(ip) : null,
  });

  if (error || !data) {
    return (
      <PublicShell>
        <StatusCard kind="error" />
      </PublicShell>
    );
  }

  const result = data as ResolveResult;

  if (result.status !== "ok") {
    return (
      <PublicShell>
        <StatusCard kind={result.status} code={code} />
      </PublicShell>
    );
  }

  // Mode redirect: HTTP redirect (307, tidak di-cache) ke tautan tujuan.
  if (result.mode === "redirect") redirect(result.redirect_url);

  return (
    <PublicShell>
      <RecordCard collection={result.collection} title={result.title} fields={result.fields} />
    </PublicShell>
  );
}
