import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/shared/components/LoadingState";
import { Upload, FileText, FileSpreadsheet, FileImage, CheckCircle2, Database } from "lucide-react";
import { ingestFile } from "@/shared/services/hospitalService";
import { toast } from "sonner";

export const Route = createFileRoute("/ingestion")({
  head: () => ({
    meta: [
      { title: "Data Ingestion — ChatMap" },
      { name: "description", content: "Upload PDFs, CSVs, Excel, or images. We extract structured hospital records using OCR and AI." },
    ],
  }),
  component: IngestionPage,
});

function IngestionPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function process(f: File) {
    setFile(f);
    setLoading(true);
    setResult(null);
    try {
      const { json } = await ingestFile(f);
      setResult(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Messy data ingestion</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Turn paper into a database.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Hospitals send bed data over WhatsApp, PDFs, scanned forms, and Excel sheets. Drop any file — we extract a structured record.
        </p>
      </div>

      <Card
        className="mt-8 cursor-pointer border-2 border-dashed bg-surface p-10 text-center transition-colors hover:bg-muted/50"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) process(f);
        }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-7 w-7" />
        </div>
        <p className="mt-4 text-base font-semibold">Drag & drop or click to upload</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF, CSV, Excel (.xlsx), or image (.jpg, .png)</p>
        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><FileText className="h-4 w-4" /> PDF</span>
          <span className="inline-flex items-center gap-1"><FileSpreadsheet className="h-4 w-4" /> CSV/XLSX</span>
          <span className="inline-flex items-center gap-1"><FileImage className="h-4 w-4" /> Images</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,.xlsx,.xls,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) process(f);
          }}
        />
      </Card>

      {loading && (
        <Card className="mt-6 p-8">
          <LoadingState label={`Running OCR + AI extraction on "${file?.name}"...`} />
          <div className="mx-auto mt-4 max-w-md space-y-2 text-xs text-muted-foreground">
            <Step label="Detecting document type" done />
            <Step label="Running OCR / table parsing" done />
            <Step label="AI extraction → structured JSON" pending />
          </div>
        </Card>
      )}

      {result && (
        <Card className="mt-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Extraction complete
              </span>
              <h3 className="mt-3 text-lg font-semibold">Extracted record</h3>
              <p className="text-xs text-muted-foreground">From {file?.name}</p>
            </div>
            <Button onClick={() => { toast.success("Added to hospital database"); setResult(null); setFile(null); }}>
              <Database className="mr-1 h-4 w-4" /> Add to hospital database
            </Button>
          </div>
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-4 text-xs leading-relaxed">
{JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}

function Step({ label, done, pending }: { label: string; done?: boolean; pending?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={"flex h-4 w-4 items-center justify-center rounded-full text-[10px] " + (done ? "bg-success text-success-foreground" : pending ? "bg-primary/20 text-primary" : "bg-muted")}>
        {done ? "✓" : pending ? "•" : ""}
      </span>
      {label}
    </div>
  );
}
