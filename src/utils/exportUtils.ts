export const exportToCSV = (data: Record<string, any>[], filename: string, columns: { key: string; label: string }[]) => {
  const header = columns.map(c => c.label).join(",");
  const rows = data.map(row =>
    columns.map(c => {
      const val = String(row[c.key] ?? "").replace(/"/g, '""');
      return `"${val}"`;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToPDF = (data: Record<string, any>[], title: string, columns: { key: string; label: string }[]) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const tableRows = data.map(row =>
    `<tr>${columns.map(c => `<td style="border:1px solid #ddd;padding:6px 8px;font-size:12px;">${row[c.key] ?? "—"}</td>`).join("")}</tr>`
  ).join("");

  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { font-size: 18px; color: #1a3a5c; margin-bottom: 4px; }
      p { font-size: 12px; color: #666; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #1a3a5c; color: white; padding: 8px; font-size: 12px; text-align: left; }
      tr:nth-child(even) { background: #f9f9f9; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h1>${title}</h1>
    <p>Generated on ${new Date().toLocaleDateString()} • ${data.length} records</p>
    <table>
      <thead><tr>${columns.map(c => `<th>${c.label}</th>`).join("")}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <script>window.onload = function() { window.print(); }</script>
    </body></html>
  `);
  printWindow.document.close();
};
