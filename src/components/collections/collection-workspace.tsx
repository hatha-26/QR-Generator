"use client";

import { ArrowLeft, Columns3, Eye, Lock, Settings, Table2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FieldsTab } from "@/components/collections/fields-tab";
import { RecordsTab } from "@/components/collections/records-tab";
import { SettingsTab } from "@/components/collections/settings-tab";
import { TemplateIcon } from "@/components/template-icon";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODE_LABELS, type Collection, type Field, type RecordRow, type ScanStats } from "@/lib/types";

export function CollectionWorkspace({
  initialCollection,
  initialFields,
  initialRecords,
  scans,
  userId,
}: {
  initialCollection: Collection;
  initialFields: Field[];
  initialRecords: RecordRow[];
  scans: ScanStats;
  userId: string;
}) {
  const [tab, setTab] = useState("data");
  const [collection, setCollection] = useState(initialCollection);
  const [fields, setFields] = useState(initialFields);
  const [records, setRecords] = useState(initialRecords);

  const totalScans = Object.values(scans).reduce((sum, s) => sum + s.scans, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Koleksi
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card">
            <TemplateIcon templateId={collection.template} className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{collection.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
              <Badge variant="outline">{MODE_LABELS[collection.mode]}</Badge>
              <span>{records.length} QR</span>
              <span aria-hidden>·</span>
              <span>{totalScans} scan</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                {collection.visibility === "public" ? <Eye className="size-3.5" /> : <Lock className="size-3.5" />}
                {collection.visibility === "public" ? "Publik" : "Privat"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="data">
            <Table2 /> Data
          </TabsTrigger>
          <TabsTrigger value="fields">
            <Columns3 /> Kolom
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings /> Pengaturan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <RecordsTab
            collection={collection}
            fields={fields}
            records={records}
            setRecords={setRecords}
            scans={scans}
            userId={userId}
            onGoToFields={() => setTab("fields")}
          />
        </TabsContent>
        <TabsContent value="fields">
          <FieldsTab
            collection={collection}
            fields={fields}
            setFields={setFields}
            onCollectionChange={setCollection}
          />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab collection={collection} fields={fields} onChange={setCollection} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
