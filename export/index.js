const express = require('express');
const cors = require('cors');
const ExcelJS = require('exceljs');

function toColumnLetter(index) {
  let letter = '';
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    value = Math.floor((value - 1) / 26);
  }
  return letter;
}

function buildWorkbook(title, grid) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(String(title).slice(0, 31) || 'Sheet1');
  const normalizedRows = (Array.isArray(grid) ? grid : []).map((row) => (Array.isArray(row) ? row : []));
  const headerRow = normalizedRows[0] || [];
  const dataRows = normalizedRows.slice(1).map((row) => row);
  const columnCount = Math.max(headerRow.length, ...dataRows.map((row) => row.length), 1);
  const normalizedHeaderRow = Array.from({ length: columnCount }, (_, index) => {
    const value = headerRow[index];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return `Column ${index + 1}`;
  });

  sheet.addRow(normalizedHeaderRow.slice(0, columnCount));
  dataRows.forEach((row) => {
    sheet.addRow(row.slice(0, columnCount));
  });

  const headerRowCells = sheet.getRow(1).eachCell ? sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAF7' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFBFC7CF' } },
      left: { style: 'thin', color: { argb: 'FFBFC7CF' } },
      bottom: { style: 'thin', color: { argb: 'FFBFC7CF' } },
      right: { style: 'thin', color: { argb: 'FFBFC7CF' } }
    };
  }) : null;

  if (headerRowCells !== null) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  const lastColumn = toColumnLetter(columnCount - 1);
  const lastRow = sheet.rowCount;
  sheet.addTable({
    name: 'Table1',
    ref: `A1:${lastColumn}${lastRow}`,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true
    },
    columns: Array.from({ length: columnCount }, (_, index) => ({
      name: String(normalizedHeaderRow[index] ?? `Column ${index + 1}`),
      filterButton: true
    })),
    rows: dataRows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ''))
  });

  return workbook;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Export service is running.',
    instructions: 'Send a POST request to /export with JSON {title, grid}.'
  });
});

app.get('/export', (req, res) => {
  res.json({
    message: 'POST to this endpoint with JSON {title, grid}.',
    example: {
      title: 'My Note',
      grid: [['A1', 'B1'], ['A2', 'B2']]
    }
  });
});

app.post('/export', async (req, res) => {
  try {
    const { title = 'note', grid = [] } = req.body || {};

    if (!Array.isArray(grid)) {
      return res.status(400).json({ error: 'Grid data required' });
    }

    const workbook = buildWorkbook(title, grid);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${String(title).replace(/[^a-z0-9-_ ]/gi, '_') || 'note'}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Export server running on http://localhost:${port}`));
