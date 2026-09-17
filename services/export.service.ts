import ExcelJS from "exceljs";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { sanitizeSpreadsheetCell } from "@/lib/export/sanitize";
import { APP_TIME_ZONE } from "@/lib/time/format";

export type ExportFormat = "csv" | "xlsx";

export type ExportTable = {
  columns: Array<{ header: string; key: string; width: number }>;
  rows: Array<Record<string, string | number>>;
};

function answerText(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join("; ");
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return value === null || value === undefined ? "" : JSON.stringify(value);
}

function safeText(value: unknown) {
  return String(sanitizeSpreadsheetCell(value ?? ""));
}

function exportDate(value: Date | null) {
  return value ? formatInTimeZone(value, APP_TIME_ZONE, "dd/MM/yyyy HH:mm:ss") : "";
}

export async function getExportTable(eventId: string): Promise<{ slug: string; table: ExportTable }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      slug: true,
      fields: { orderBy: { order: "asc" }, select: { id: true, label: true, fieldKey: true } },
      registrations: {
        orderBy: { registeredAt: "asc" },
        select: {
          registrationCode: true,
          studentId: true,
          fullName: true,
          email: true,
          phone: true,
          faculty: true,
          registeredAt: true,
          status: true,
          answers: { select: { eventFieldId: true, value: true } },
          checkin: { select: { checkedInAt: true, method: true } }
        }
      }
    }
  });
  if (!event) throw new AppError("EVENT_NOT_FOUND", "Không tìm thấy sự kiện.", 404);

  const fixedColumns = [
    { header: "Registration Code", key: "registrationCode", width: 22 },
    { header: "MSSV", key: "studentId", width: 18 },
    { header: "Full Name", key: "fullName", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Faculty", key: "faculty", width: 22 }
  ];
  const customColumns = event.fields.map((field) => ({
    header: safeText(field.label),
    key: `custom_${field.fieldKey}`,
    width: 24
  }));
  const trailingColumns = [
    { header: "Registered At", key: "registeredAt", width: 22 },
    { header: "Registration Status", key: "registrationStatus", width: 20 },
    { header: "Check-in Status", key: "checkinStatus", width: 18 },
    { header: "Checked In At", key: "checkedInAt", width: 22 },
    { header: "Check-in Method", key: "checkinMethod", width: 18 }
  ];

  const rows = event.registrations.map((registration) => {
    const answerByField = new Map(
      registration.answers.map((answer) => [answer.eventFieldId, answer.value])
    );
    const row: Record<string, string | number> = {
      registrationCode: safeText(registration.registrationCode),
      studentId: safeText(registration.studentId),
      fullName: safeText(registration.fullName),
      email: safeText(registration.email),
      phone: safeText(registration.phone),
      faculty: safeText(registration.faculty),
      registeredAt: exportDate(registration.registeredAt),
      registrationStatus: registration.status,
      checkinStatus: registration.checkin ? "CHECKED_IN" : "NOT_CHECKED_IN",
      checkedInAt: exportDate(registration.checkin?.checkedInAt ?? null),
      checkinMethod: registration.checkin?.method ?? ""
    };
    for (const field of event.fields) {
      row[`custom_${field.fieldKey}`] = safeText(answerText(answerByField.get(field.id)));
    }
    return row;
  });

  return {
    slug: event.slug,
    table: { columns: [...fixedColumns, ...customColumns, ...trailingColumns], rows }
  };
}

function csvCell(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

export function tableToCsv(table: ExportTable) {
  const header = table.columns.map((column) => csvCell(column.header)).join(",");
  const rows = table.rows.map((row) =>
    table.columns.map((column) => csvCell(row[column.key] ?? "")).join(",")
  );
  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export async function tableToXlsx(table: ExportTable) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QPass";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Attendance", {
    views: [{ state: "frozen", ySplit: 1 }]
  });
  worksheet.columns = table.columns;
  worksheet.addRows(table.rows);
  worksheet.autoFilter = { from: "A1", to: worksheet.getRow(1).getCell(table.columns.length).address };
  const header = worksheet.getRow(1);
  header.height = 24;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF117864" } };
  header.alignment = { vertical: "middle" };
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true };
  });
  return workbook.xlsx.writeBuffer();
}

export async function createEventExport(eventId: string, format: ExportFormat) {
  const { slug, table } = await getExportTable(eventId);
  const date = formatInTimeZone(new Date(), APP_TIME_ZONE, "yyyy-MM-dd");
  const filename = `${slug}_attendance_${date}.${format}`;
  if (format === "csv") {
    return {
      filename,
      contentType: "text/csv; charset=utf-8",
      body: tableToCsv(table)
    };
  }
  return {
    filename,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: await tableToXlsx(table)
  };
}
