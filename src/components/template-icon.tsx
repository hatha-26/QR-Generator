import { ClipboardCheck, Link2, LockKeyhole, MessageCircle, Sprout, Table2 } from "lucide-react";
import { getTemplate, type TemplateIcon as IconName } from "@/lib/templates";

const MAP: Record<IconName, typeof Table2> = {
  sprout: Sprout,
  contact: MessageCircle,
  link: Link2,
  locker: LockKeyhole,
  attendance: ClipboardCheck,
  blank: Table2,
};

export function TemplateIcon({
  templateId,
  icon,
  className,
}: {
  templateId?: string | null;
  icon?: IconName;
  className?: string;
}) {
  const name = icon ?? getTemplate(templateId)?.icon ?? "blank";
  const Cmp = MAP[name] ?? Table2;
  return <Cmp className={className} />;
}
