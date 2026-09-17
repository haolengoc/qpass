import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  tableToCsv,
  tableToXlsx,
  type ExportTable
} from "@/services/export.service";

const table: ExportTable = {
  columns: [
    { header: "Full Name", key: "fullName", width: 28 },
    { header: "Note", key: "note", width: 24 }
  ],
  rows: [
    { fullName: "Nguyễn Văn A", note: "Dòng 1, \"quan trọng\"" },
    { fullName: "'=HYPERLINK(\"bad\")", note: "Bình thường" }
  ]
};

describe("event export", () => {
  it("creates a UTF-8 CSV with quoted and escaped cells", () => {
    const csv = tableToCsv(table);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Full Name","Note"');
    expect(csv).toContain('"Nguyễn Văn A","Dòng 1, ""quan trọng"""');
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  });

  it("creates a readable XLSX workbook with the expected sheet settings", async () => {
    const buffer = await tableToXlsx(table);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Attendance");

    expect(worksheet).toBeDefined();
    expect(worksheet?.getCell("A1").value).toBe("Full Name");
    expect(worksheet?.getCell("A2").value).toBe("Nguyễn Văn A");
    expect(worksheet?.getCell("A3").value).toBe("'=HYPERLINK(\"bad\")");
    expect(worksheet?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(worksheet?.autoFilter).toBe("A1:B1");
  });
});
