"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileSpreadsheet, ArrowRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/lib/hooks/use-organization";
import { bulkImportLeads } from "@/lib/hooks/use-leads";
import Papa from "papaparse";

const LEAD_FIELDS = [
  { key: "skip", label: "Пропустити" },
  { key: "phone", label: "Телефон" },
  { key: "name", label: "Ім'я" },
  { key: "email", label: "Email" },
  { key: "company", label: "Компанія" },
  { key: "position", label: "Посада" },
  { key: "tags", label: "Теги" },
  { key: "notes", label: "Нотатки" },
];

// Auto-detect column mapping
function autoDetectField(header: string): string {
  const h = header.toLowerCase().trim();
  if (h.includes("phone") || h.includes("телефон") || h.includes("тел")) return "phone";
  if (h.includes("name") || h.includes("ім'я") || h.includes("имя") || h === "name") return "name";
  if (h.includes("email") || h.includes("пошта") || h.includes("mail")) return "email";
  if (h.includes("company") || h.includes("компанія") || h.includes("компания") || h.includes("організація")) return "company";
  if (h.includes("position") || h.includes("посада") || h.includes("должность") || h.includes("title")) return "position";
  if (h.includes("tag") || h.includes("тег")) return "tags";
  if (h.includes("note") || h.includes("нотатк") || h.includes("коментар") || h.includes("comment")) return "notes";
  return "skip";
}

export default function ImportLeadsPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [step, setStep] = useState(0); // 0: upload, 1: map columns, 2: result
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setError(null);

    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length < 2) {
          setError("Файл порожній або має менше 2 рядків");
          return;
        }

        const hdrs = data[0].map((h) => h.trim());
        setHeaders(hdrs);
        setCsvData(data.slice(1).filter((row) => row.some((cell) => cell.trim())));

        // Auto-map columns
        const autoMap: Record<number, string> = {};
        hdrs.forEach((h, i) => {
          autoMap[i] = autoDetectField(h);
        });
        setMapping(autoMap);
        setStep(1);
      },
      error: () => {
        setError("Помилка при читанні файлу");
      },
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (!organization) return;

    // Check phone column is mapped
    const phoneCol = Object.entries(mapping).find(([, v]) => v === "phone");
    if (!phoneCol) {
      setError("Необхідно вказати колонку з телефоном");
      return;
    }

    setImporting(true);
    setError(null);

    // Transform CSV data to lead objects
    const leads = csvData
      .map((row) => {
        const lead: Record<string, unknown> = {};
        Object.entries(mapping).forEach(([colIdx, field]) => {
          if (field === "skip") return;
          const val = row[parseInt(colIdx)]?.trim();
          if (!val) return;
          if (field === "tags") {
            lead.tags = val.split(",").map((t: string) => t.trim()).filter(Boolean);
          } else {
            lead[field] = val;
          }
        });
        return lead;
      })
      .filter((l) => l.phone);

    if (leads.length === 0) {
      setError("Жоден рядок не містить телефону");
      setImporting(false);
      return;
    }

    const { inserted, skipped, error: importError } = await bulkImportLeads(
      organization.id,
      leads
    );

    if (importError) {
      setError(importError);
      setImporting(false);
      return;
    }

    setResult({ inserted, skipped });
    setStep(2);
    setImporting(false);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push("/dashboard/leads")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Ліди
      </button>

      <h1 className="text-2xl font-bold text-white">Імпорт лідів з CSV</h1>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {["Завантажити файл", "Маппінг колонок", "Результат"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            <span
              className={
                i === step
                  ? "text-brand font-medium"
                  : i < step
                    ? "text-success"
                    : "text-muted-foreground"
              }
            >
              {i < step ? <Check className="inline h-3 w-3 mr-1" /> : null}
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="glass rounded-xl border-2 border-dashed border-border p-12 text-center"
        >
          <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-sm text-white">
            Перетягніть CSV файл сюди або натисніть для вибору
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Підтримуються .csv файли з роздільником , або ;
          </p>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="mr-1.5 h-4 w-4" />
                Обрати файл
              </span>
            </Button>
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        </div>
      )}

      {/* Step 1: Column mapping */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <p className="mb-1 text-sm text-white">
              Файл: <span className="font-mono">{fileName}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {csvData.length} рядків знайдено
            </p>
          </div>

          {/* Mapping table */}
          <div className="glass overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Колонка CSV</th>
                    <th className="px-4 py-3">Поле ліда</th>
                    <th className="px-4 py-3">Приклад</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50"
                    >
                      <td className="px-4 py-3 font-mono text-white">
                        {header}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={mapping[i] || "skip"}
                          onValueChange={(v) =>
                            setMapping((m) => ({ ...m, [i]: v }))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_FIELDS.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {csvData.slice(0, 3).map((row) => row[i]?.trim()).filter(Boolean).join(" | ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview */}
          <div className="glass overflow-hidden rounded-xl">
            <h3 className="border-b border-border px-4 py-3 text-sm font-medium text-white">
              Попередній перегляд (перші 5 рядків)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="border-b border-border/50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 text-white whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>
              Назад
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Імпортувати {csvData.length} лідів
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Result */}
      {step === 2 && result && (
        <div className="glass rounded-xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-white">Імпорт завершено</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              Імпортовано:{" "}
              <span className="font-mono text-success">{result.inserted}</span> лідів
            </p>
            {result.skipped > 0 && (
              <p>
                Пропущено (дублікати):{" "}
                <span className="font-mono text-warning">{result.skipped}</span>
              </p>
            )}
          </div>
          <Button onClick={() => router.push("/dashboard/leads")}>
            Перейти до лідів
          </Button>
        </div>
      )}
    </div>
  );
}
