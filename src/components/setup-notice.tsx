import { TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupNotice() {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <TriangleAlert className="size-5" />
        </div>
        <CardTitle className="text-lg">Supabase belum dikonfigurasi</CardTitle>
        <CardDescription>
          Aplikasi butuh project Supabase untuk menyimpan data dan login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>Buat project di supabase.com.</li>
          <li>
            Jalankan semua file di <code className="font-mono text-foreground">supabase/migrations</code>{" "}
            (urut) lewat SQL Editor.
          </li>
          <li>
            Salin <code className="font-mono text-foreground">.env.example</code> menjadi{" "}
            <code className="font-mono text-foreground">.env.local</code>, isi URL dan publishable key.
          </li>
          <li>Restart server dev.</li>
        </ol>
        <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}
        </pre>
      </CardContent>
    </Card>
  );
}
