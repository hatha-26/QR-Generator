"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function translateError(message: string) {
  if (/invalid login credentials/i.test(message)) return "Email atau kata sandi salah.";
  if (/already registered|already been registered/i.test(message)) return "Email ini sudah terdaftar. Silakan masuk.";
  if (/at least \d+ characters/i.test(message)) return "Kata sandi minimal 6 karakter.";
  if (/email not confirmed/i.test(message)) return "Email belum dikonfirmasi. Cek kotak masukmu.";
  if (/rate limit/i.test(message)) return "Terlalu banyak percobaan. Coba lagi sebentar lagi.";
  return message;
}

export function AuthForm({ next, initialMode }: { next: string; initialMode: "login" | "signup" }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: translateError(error.message) });
        setBusy(false);
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setMessage({ type: "error", text: translateError(error.message) });
      setBusy(false);
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    setMessage({ type: "info", text: "Kami mengirim email konfirmasi. Buka tautannya, lalu kamu otomatis masuk." });
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Minimal 6 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            message.type === "error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-brand/30 bg-brand/10 text-foreground",
          )}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy && <Loader2 className="animate-spin" />}
        {mode === "login" ? "Masuk" : "Buat akun"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage(null);
          }}
        >
          {mode === "login" ? "Daftar" : "Masuk"}
        </button>
      </p>
    </form>
  );
}
