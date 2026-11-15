import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { SetupNotice } from "@/components/setup-notice";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNext } from "@/lib/utils";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(next);
  }

  const signup = sp.mode === "signup";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        {isSupabaseConfigured ? (
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{signup ? "Buat akun" : "Selamat datang kembali"}</CardTitle>
              <CardDescription>
                {signup ? "Mulai membuat QR dalam hitungan menit." : "Masuk untuk mengelola koleksi QR-mu."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sp.error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Tautan konfirmasi tidak valid atau sudah kedaluwarsa. Silakan coba masuk lagi.
                </p>
              )}
              <AuthForm next={next} initialMode={signup ? "signup" : "login"} />
            </CardContent>
          </Card>
        ) : (
          <SetupNotice />
        )}
      </main>
    </div>
  );
}
