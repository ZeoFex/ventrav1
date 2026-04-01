import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Export data to a neatly designed Excel file.
 */
export async function exportToExcel({
    data,
    columns,
    filename,
    sheetName = "Sheet1",
}: {
    data: any[];
    columns: { header: string; key: string; width?: number; isCurrency?: boolean }[];
    filename: string;
    sheetName?: string;
}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // 1. Setup Columns
    worksheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 20,
    }));

    // 2. Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF006C49" }, // Ventra Green
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    // 3. Add Data Rows
    data.forEach((item) => {
        worksheet.addRow(item);
    });

    // 4. Style Data Rows & Format Currency
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        row.alignment = { vertical: "middle" };
        row.height = 22;

        // Add thin borders.
        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin", color: { argb: "FFE0E0E0" } },
                left: { style: "thin", color: { argb: "FFE0E0E0" } },
                bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
                right: { style: "thin", color: { argb: "FFE0E0E0" } },
            };
        });

        // Apply currency format to specific columns
        columns.forEach((col, index) => {
            if (col.isCurrency) {
                const cell = row.getCell(index + 1);
                cell.numFmt = '"GH₵" #,##0.00';
            }
        });
    });

    // 5. Generate and Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `${filename.replace(/\.[^/.]+$/, "")}.xlsx`);
}

/**
 * Export data to a standard CSV file.
 */
export function exportToCSV(data: any[], columns: { header: string, key: string }[], filename: string) {
    const headers = columns.map(c => c.header).join(",");
    const rows = data.map(item =>
        columns.map(col => {
            const val = item[col.key];
            // Escape quotes and wrap in quotes if contains comma
            const stringVal = String(val ?? "").replace(/"/g, '""');
            return stringVal.includes(",") ? `"${stringVal}"` : stringVal;
        }).join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${filename.replace(/\.[^/.]+$/, "")}.csv`);
}
