"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "!border-border !bg-popover !text-popover-foreground !shadow-lg !rounded-lg",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
