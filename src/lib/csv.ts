import * as XLSX from 'xlsx'

// Parser & ekspor CSV dan Excel (.xlsx / .xls)

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const delimiter = text.includes(';') && !text.split('\n')[0].includes(',') ? ';' : ','

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}

export function parseWorkbook(data: ArrayBuffer | Uint8Array | string): string[][] {
  if (!data) return []
  try {
    const wb =
      typeof data === 'string'
        ? XLSX.read(data, { type: 'string' })
        : XLSX.read(data, { type: 'array' })
    const firstSheetName = wb.SheetNames[0]
    if (!firstSheetName) return []
    const sheet = wb.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' })
    return rows
      .map((r) => r.map((c) => String(c ?? '').trim()))
      .filter((r) => r.some((c) => c !== ''))
  } catch {
    if (typeof data === 'string') {
      return parseCSV(data)
    }
    return []
  }
}

export function parseXLS(content: string | ArrayBuffer): string[][] {
  return parseWorkbook(content)
}

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n')
}

function escapeXml(val: string | number): string {
  const s = String(val ?? '')
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatCell(val: string | number): string {
  if (typeof val === 'number') {
    return `<Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${val}</Data></Cell>`
  }
  const s = String(val ?? '')
  const trimmed = s.trim()
  if (/^-?\d+(\.\d+)?$/.test(trimmed) && (!trimmed.startsWith('0') || trimmed === '0')) {
    return `<Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${trimmed}</Data></Cell>`
  }
  return `<Cell ss:StyleID="TextStyle"><Data ss:Type="String">${escapeXml(s)}</Data></Cell>`
}

export function toXLS(headers: string[], rows: (string | number)[][], sheetName = 'Laporan'): string {
  const cleanSheetName = (sheetName || 'Sheet1').replace(/[/\\?*:[\]]/g, '').slice(0, 31) || 'Sheet1'
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>iPOS</Author>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TextStyle">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#334155"/>
  </Style>
  <Style ss:ID="NumberStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#334155"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${cleanSheetName}">
  <Table>
   ${headers.map(() => '<Column ss:AutoFitWidth="1" ss:Width="120"/>').join('')}
   <Row ss:Height="24">
    ${headers.map((h) => `<Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}
   </Row>
   ${rows
     .map(
       (r) => `<Row ss:Height="20">
      ${r.map(formatCell).join('')}
    </Row>`,
     )
     .join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`
}

export function downloadFile(filename: string, content: string, mime = 'application/vnd.ms-excel;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportXLSX(filename: string, headers: string[], rows: (string | number)[][], sheetName = 'Laporan') {
  const wb = XLSX.utils.book_new()
  const cleanSheetName = (sheetName || 'Sheet1').replace(/[/\\?*:[\]]/g, '').slice(0, 31) || 'Sheet1'
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 3) }))
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName)
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const xlsxName = filename.replace(/\.(csv|xls|xlsx)$/i, '') + '.xlsx'
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = xlsxName
  a.click()
  URL.revokeObjectURL(url)
}

export function exportXLS(filename: string, headers: string[], rows: (string | number)[][], sheetName = 'Laporan') {
  exportXLSX(filename, headers, rows, sheetName)
}

export function exportRawCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  downloadFile(filename, toCSV(headers, rows), 'text/csv;charset=utf-8;')
}

export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  exportXLSX(filename, headers, rows)
}
