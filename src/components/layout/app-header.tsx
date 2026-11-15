import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function AppHeader({ email }: { email: string | undefined }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo href="/app" />
        <div className="flex items-center gap-1.5">
          {email && (
            <span className="mr-1 hidden max-w-[220px] truncate text-sm text-muted-foreground sm:block">
              {email}
            </span>
          )}
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              <LogOut /> Keluar
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
