import { useParams, useLocation } from "wouter";
import { useGetTool, getGetToolQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, MapPin, User, DollarSign } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  in_use: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  calibration: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  damaged: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  lost: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Tersedia", in_use: "Digunakan", maintenance: "Maintenance",
  calibration: "Kalibrasi", damaged: "Rusak", lost: "Hilang",
};

export function ToolDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const { data: tool, isLoading } = useGetTool(id, { query: { enabled: !!id, queryKey: getGetToolQueryKey(id) } });

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!tool) return (
    <div className="text-center py-16 text-muted-foreground">Alat tidak ditemukan</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tools")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{tool.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">{tool.code}</p>
        </div>
        <Badge className={`text-xs ${STATUS_COLORS[tool.status] ?? ""}`}>{STATUS_LABELS[tool.status] ?? tool.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Informasi Alat</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Kategori", tool.category],
                ["Serial Number", tool.serialNumber ?? "-"],
                ["Brand", tool.brand ?? "-"],
                ["Model", tool.model ?? "-"],
                ["Tahun Beli", tool.purchaseYear ?? "-"],
                ["Kondisi", tool.condition],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Informasi Operasional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {tool.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{tool.location}</span>
              </div>
            )}
            {tool.pic && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>PIC: {tool.pic}</span>
              </div>
            )}
            {tool.assetValue && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Nilai Aset: Rp {Number(tool.assetValue).toLocaleString("id-ID")}</span>
              </div>
            )}
            {tool.nextMaintenanceDate != null && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Maintenance: {new Date(tool.nextMaintenanceDate).toLocaleDateString("id-ID")}</span>
              </div>
            )}
            {tool.nextCalibrationDate != null && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-amber-500" />
                <span>Kalibrasi: {new Date(tool.nextCalibrationDate).toLocaleDateString("id-ID")}</span>
              </div>
            )}
            {tool.lastUsedBy && (
              <div className="text-sm text-muted-foreground">
                Terakhir digunakan oleh: <span className="font-medium text-foreground">{tool.lastUsedBy}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4 text-xs text-muted-foreground flex gap-6">
          <div>Dibuat: {new Date(tool.createdAt).toLocaleDateString("id-ID")}</div>
          <div>Diperbarui: {tool.updatedAt ? new Date(tool.updatedAt).toLocaleDateString("id-ID") : "-"}</div>
        </CardContent>
      </Card>
    </div>
  );
}
