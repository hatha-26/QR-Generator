import { ExternalLink, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicField } from "@/lib/types";
import { formatDate, isHttpUrl, normalizePhone } from "@/lib/utils";

function isEmptyValue(v: unknown) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Value({ field }: { field: PublicField }) {
  const v = field.value;
  switch (field.type) {
    case "checkbox":
      return <Badge variant={v ? "brand" : "muted"}>{v ? "Ya" : "Tidak"}</Badge>;
    case "select":
      return <Badge variant="outline">{String(v)}</Badge>;
    case "date":
      return <span>{formatDate(String(v))}</span>;
    case "url": {
      const url = String(v);
      return isHttpUrl(url) ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-4"
        >
          {hostOf(url)} <ExternalLink className="size-3.5" />
        </a>
      ) : (
        <span>{url}</span>
      );
    }
    case "phone": {
      const text = String(v);
      const digits = normalizePhone(text);
      if (digits.length < 6) return <span>{text}</span>;
      return (
        <div className="flex flex-col items-end gap-2 max-sm:items-start">
          <span>{text}</span>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`tel:+${digits}`}>
                <Phone /> Telepon
              </a>
            </Button>
          </div>
        </div>
      );
    }
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={String(v)} alt={field.label} loading="lazy" className="max-h-40 rounded-lg border object-cover" />
      );
    default:
      return <span>{String(v)}</span>;
  }
}

/** Kartu hasil scan (mode "display"). */
export function RecordCard({
  collection,
  title,
  fields,
}: {
  collection: string;
  title: string | null;
  fields: PublicField[];
}) {
  const filled = fields.filter((f) => !isEmptyValue(f.value));
  const hero = filled.find((f) => f.type === "image");

  // Jangan tampilkan ulang nilai yang sudah jadi judul.
  const titleIndex = title
    ? filled.findIndex((f) => f.type === "text" && String(f.value) === title)
    : -1;
  const rows = filled.filter((f, i) => f !== hero && i !== titleIndex);

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={String(hero.value)} alt={title ?? hero.label} className="aspect-[4/3] w-full object-cover" />
      )}
      <div className="p-6">
        <Badge variant="brand">{collection}</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance">{title || "Tanpa judul"}</h1>

        {rows.length > 0 && (
          <dl className="mt-5 divide-y border-y">
            {rows.map((f) => (
              <div
                key={f.key}
                className={
                  f.type === "longtext"
                    ? "flex flex-col gap-1.5 py-3.5"
                    : "flex items-start justify-between gap-6 py-3.5 max-sm:flex-col max-sm:gap-1.5"
                }
              >
                <dt className="shrink-0 text-sm text-muted-foreground">{f.label}</dt>
                <dd
                  className={
                    f.type === "longtext"
                      ? "text-sm leading-relaxed whitespace-pre-line"
                      : "min-w-0 text-right text-sm font-medium break-words max-sm:text-left"
                  }
                >
                  <Value field={f} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}
