/**
 * Export data to Excel (.xls) using SpreadsheetML format.
 * Works in all browsers without any external library.
 * Opens natively in Microsoft Excel, LibreOffice, and Google Sheets.
 */

type CellValue = string | number | null | undefined;

function escapeXml(val: CellValue): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cellType(val: CellValue): 'Number' | 'String' {
  return typeof val === 'number' && !isNaN(val) ? 'Number' : 'String';
}

function buildRow(cells: CellValue[], bold = false): string {
  const cellsXml = cells
    .map(val => {
      const type = cellType(val);
      const style = bold ? ' ss:StyleID="bold"' : '';
      return `<Cell${style}><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`;
    })
    .join('');
  return `<Row>${cellsXml}</Row>`;
}

/**
 * @param filename  Base name without extension (date appended automatically)
 * @param sheetName Name of the Excel sheet tab
 * @param headers   Array of column header strings
 * @param rows      2-D array of data rows (each row = array of values)
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: CellValue[][]
): void {
  const today = new Date().toISOString().slice(0, 10);

  const headerRow = buildRow(headers, true);
  const dataRows = rows.map(row => buildRow(row)).join('\n    ');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="bold">
      <Font ss:Bold="1"/>
    </Style>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1E40AF" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>
    ${headerRow}
    ${dataRows}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>1</SplitHorizontal>
      <TopRowBottomPane>1</TopRowBottomPane>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${today}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
