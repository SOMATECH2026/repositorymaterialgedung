import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel, exportToPDF, type ExportColumn } from "@/lib/export";

interface ExportMenuProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  title: string;
  filename: string;
  disabled?: boolean;
}

export function ExportMenu({ data, columns, title, filename, disabled }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || !data.length} data-testid="button-export">
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToExcel(data, columns, filename)} data-testid="button-export-excel">
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPDF(data, columns, title, filename)} data-testid="button-export-pdf">
          <FileText className="h-4 w-4 mr-2 text-red-600" /> PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
