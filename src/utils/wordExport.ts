import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  AlignmentType, 
  WidthType, 
  BorderStyle, 
  PageOrientation,
  ShadingType
} from 'docx';
import { BeritaAcaraData, BeritaAcaraRow } from '../types/beritaAcara';

/**
 * Generate binary .docx file using docx library in Landscape orientation
 */
export async function generateDocxBlob(data: BeritaAcaraData): Promise<Blob> {
  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  const cellMargins = {
    top: 100,
    bottom: 100,
    left: 120,
    right: 120,
  };

  // Build table rows
  const tableRows: TableRow[] = [];

  // Header Row 1: No | Sampel Utama (span 4) | Sampel Pengganti dengan Subsektor Berbeda (span 4)
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          rowSpan: 2,
          verticalAlign: 'center',
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 5, type: WidthType.PERCENTAGE },
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          columnSpan: 4,
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 47, type: WidthType.PERCENTAGE },
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Sampel Utama', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
        new TableCell({
          columnSpan: 4,
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 48, type: WidthType.PERCENTAGE },
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Sampel Pengganti dengan Subsektor Berbeda', bold: true, size: 18, font: 'Arial' })],
            }),
          ],
        }),
      ],
    })
  );

  // Header Row 2: Sub-headers
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        // Utama sub-headers
        new TableCell({
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 11, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NKS', bold: true, size: 17, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 8, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NUS', bold: true, size: 17, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 16, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nama KRT/\nNama ART Lainnya', bold: true, size: 17, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 12, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Subsektor (Komoditas)', bold: true, size: 17, font: 'Arial' })] })],
        }),
        // Pengganti sub-headers
        new TableCell({
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 11, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NKS', bold: true, size: 17, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 8, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NUS', bold: true, size: 17, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 16, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nama KRT/\nNama ART Lainnya', bold: true, size: 17, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: tableBorder,
          margins: cellMargins,
          width: { size: 13, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Subsektor (Komoditas)', bold: true, size: 17, font: 'Arial' })] })],
        }),
      ],
    })
  );

  // Header Row 3: Column numbers (1) s/d (9)
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        '(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)'
      ].map((num) =>
        new TableCell({
          borders: tableBorder,
          margins: cellMargins,
          shading: { fill: 'FAFAFA', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: num, size: 15, font: 'Arial' })],
            }),
          ],
        })
      ),
    })
  );

  // Determine total rows: if user has more than 5, adjust rows to that number. If <= 5, display at least 5 rows (matching template).
  const rowCount = Math.max(data.rows.length, 5);
  for (let i = 0; i < rowCount; i++) {
    const row = data.rows[i];
    tableRows.push(
      new TableRow({
        children: [
          // (1) No
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(i + 1), font: 'Arial', size: 17 })],
              }),
            ],
          }),
          // (2) NKS Utama
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: row ? row.utamaNks : '', font: 'Arial', size: 17 })],
              }),
            ],
          }),
          // (3) NUS Utama
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: row ? row.utamaNus : '', font: 'Arial', size: 17, bold: true })],
              }),
            ],
          }),
          // (4) Nama KRT Utama
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: row ? row.utamaNamaKrt : '', font: 'Arial', size: 17 })],
              }),
            ],
          }),
          // (5) Subsektor Utama
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ 
                    text: row ? (row.utamaKomoditasPrioritas ? `${row.utamaSubsektor}\n(${row.utamaKomoditasPrioritas})` : row.utamaSubsektor) : '', 
                    font: 'Arial', 
                    size: 17 
                  })
                ],
              }),
            ],
          }),
          // (6) NKS Pengganti
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: row ? row.penggantiNks : '', font: 'Arial', size: 17 })],
              }),
            ],
          }),
          // (7) NUS Pengganti
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: row ? row.penggantiNus : '', font: 'Arial', size: 17, bold: true })],
              }),
            ],
          }),
          // (8) Nama KRT Pengganti
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: row ? row.penggantiNamaKrt : '', font: 'Arial', size: 17 })],
              }),
            ],
          }),
          // (9) Subsektor Pengganti
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ 
                    text: row ? (row.penggantiKomoditasPrioritas ? `${row.penggantiSubsektor}\n(${row.penggantiKomoditasPrioritas})` : row.penggantiSubsektor) : '', 
                    font: 'Arial', 
                    size: 17 
                  })
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  // Row "dst" at the end if <= 5
  if (data.rows.length <= 5) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            borders: tableBorder,
            margins: cellMargins,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'dst', font: 'Arial', size: 16, italics: true })] })],
          }),
          ...Array.from({ length: 8 }).map(() =>
            new TableCell({
              borders: tableBorder,
              margins: cellMargins,
              children: [new Paragraph({ children: [] })],
            })
          ),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 16838,
              height: 11906,
            },
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000,
            },
          },
        },
        children: [
          // Kop Surat
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: 'BADAN PUSAT STATISTIK\n', bold: true, size: 26, font: 'Arial' }),
              new TextRun({ text: `KABUPATEN ${data.kabupatenNama.toUpperCase()}\n`, bold: true, size: 24, font: 'Arial' }),
              new TextRun({ text: 'Jalan Supadio KM.19,5 No.04/12 Telp. (0561) 724189 Fax (0561) 724189\n', size: 17, font: 'Arial' }),
              new TextRun({ text: `E-mail: bps${data.provinsiKode}${data.kabupatenKode}@bps.go.id Homepage: http://${data.kabupatenNama.toLowerCase().replace(/\s+/g, '')}kab.bps.go.id`, size: 17, font: 'Arial' }),
            ],
          }),

          // Divider Line
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 16, color: '000000', space: 4 },
            },
            spacing: { after: 200 },
          }),

          // Judul Berita Acara
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: data.nomorSurat ? 40 : 140 },
            children: [
              new TextRun({
                text: data.judulBeritaAcara || 'BERITA ACARA PENGGANTIAN SAMPEL SUBSEKTOR BERBEDA',
                bold: true,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),

          ...(data.nomorSurat ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 140 },
              children: [
                new TextRun({
                  text: `Nomor: ${data.nomorSurat}`,
                  size: 18,
                  font: 'Arial',
                }),
              ],
            })
          ] : []),

          // Paragraf Narasi
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: data.paragrafPembuka || `Sampel Utama Survei Pertanian Terintegrasi (SITASI) ${data.tahun} dengan identitas pada kolom (2) sampai dengan kolom (5) telah dilakukan 4 (empat) tahapan penggantian sampel RTUP, akan tetapi masih belum ditemukan sampel pengganti pada daftar sampel cadangan yang bersesuaian dengan subsektor utama sehingga dilakukan penggantian sampel dengan subsektor yang berbeda seperti tertera pada kolom (6) sampai dengan kolom (9).`,
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          // Identitas Wilayah
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Provinsi     : ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: `[${data.provinsiKode}] Provinsi ${data.provinsiNama}`, size: 18, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({ text: 'Kabupaten : ', bold: true, size: 18, font: 'Arial' }),
              new TextRun({ text: `[${data.kabupatenKode}] Kabupaten ${data.kabupatenNama}`, size: 18, font: 'Arial' }),
            ],
          }),

          // Tabel Berita Acara
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          // Penutup
          new Paragraph({
            spacing: { before: 140, after: 180 },
            children: [
              new TextRun({
                text: data.paragrafPenutup || 'Demikian berita acara ini dibuat dengan sebenar-benarnya.',
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          // Tanda Tangan
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: `${data.tempat}, ${data.tanggal}\n`,
                size: 18,
                font: 'Arial',
              }),
              new TextRun({
                text: `${data.pejabatJabatan}\n\n\n\n`,
                size: 18,
                font: 'Arial',
              }),
              new TextRun({
                text: `${data.pejabatNama}\n`,
                bold: true,
                size: 18,
                font: 'Arial',
              }),
              new TextRun({
                text: `NIP. ${data.pejabatNip}`,
                size: 17,
                font: 'Arial',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generate Word .doc (Word-compliant HTML with MSO namespaces)
 * Compatible with Word, Google Docs, LibreOffice, WPS Office
 */
export function generateWordDocHTML(data: BeritaAcaraData): string {
  const rowCount = Math.max(data.rows.length, 5);

  let rowsHtml = '';
  for (let i = 0; i < rowCount; i++) {
    const row = data.rows[i];
    rowsHtml += `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${i + 1}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px; font-family: monospace;">${row ? row.utamaNks : ''}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px; font-weight: bold; font-family: monospace;">${row ? row.utamaNus : ''}</td>
        <td style="border: 1px solid #000; padding: 6px;">${row ? row.utamaNamaKrt : ''}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${row ? `${row.utamaSubsektor}${row.utamaKomoditasPrioritas ? `<br><span style="font-size: 8.5pt; color: #444;">(${row.utamaKomoditasPrioritas})</span>` : ''}` : ''}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px; font-family: monospace;">${row ? row.penggantiNks : ''}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px; font-weight: bold; font-family: monospace;">${row ? row.penggantiNus : ''}</td>
        <td style="border: 1px solid #000; padding: 6px;">${row ? row.penggantiNamaKrt : ''}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${row ? `${row.penggantiSubsektor}${row.penggantiKomoditasPrioritas ? `<br><span style="font-size: 8.5pt; color: #444;">(${row.penggantiKomoditasPrioritas})</span>` : ''}` : ''}</td>
      </tr>
    `;
  }

  if (data.rows.length <= 5) {
    rowsHtml += `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 6px; font-style: italic;">dst</td>
        <td style="border: 1px solid #000; padding: 6px;"></td>
        <td style="border: 1px solid #000; padding: 6px;"></td>
        <td style="border: 1px solid #000; padding: 6px;"></td>
        <td style="border: 1px solid #000; padding: 6px;"></td>
        <td style="border: 1px solid #000; padding: 6px;"></td>
        <td style="border: 1px solid #000; padding: 6px;"></td>
        <td style="border: 1px solid #000; padding: 6px;"></td>
        <td style="border: 1px solid #000; padding: 6px;"></td>
      </tr>
    `;
  }

  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Berita Acara Penggantian Sampel Subsektor Berbeda</title>
      <style>
        @page {
          size: 29.7cm 21.0cm; /* A4 Landscape */
          margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          mso-page-orientation: landscape;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11pt;
          line-height: 1.3;
          color: #000;
        }
        .header-title {
          font-size: 14pt;
          font-weight: bold;
        }
        .header-sub {
          font-size: 9pt;
          color: #222;
        }
        .divider {
          border-bottom: 2px solid #000;
          margin-top: 6px;
          margin-bottom: 16px;
        }
        .doc-title {
          text-align: center;
          font-size: 13pt;
          font-weight: bold;
          margin-bottom: 14px;
        }
        .narrative {
          text-align: justify;
          margin-bottom: 12px;
          line-height: 1.4;
        }
        .meta-table {
          margin-bottom: 14px;
          font-size: 11pt;
        }
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
          margin-bottom: 16px;
        }
        table.data-table th {
          border: 1px solid #000;
          background-color: #f2f2f2;
          padding: 6px;
          text-align: center;
        }
        .sign-section {
          width: 320px;
          margin-left: auto;
          text-align: center;
          margin-top: 24px;
        }
      </style>
    </head>
    <body>
      <table style="width: 100%;">
        <tr>
          <td style="width: 80px; vertical-align: top;">
            <!-- BPS Symbol -->
            <svg width="60" height="40" viewBox="0 0 60 40">
              <polygon points="10,5 25,5 20,20 5,20" fill="#0088cc" />
              <polygon points="28,5 43,5 38,20 23,20" fill="#f58220" />
              <polygon points="18,22 33,22 28,37 13,37" fill="#77b829" />
              <polygon points="36,22 51,22 46,37 31,37" fill="#0088cc" />
            </svg>
          </td>
          <td style="vertical-align: top;">
            <div class="header-title">BADAN PUSAT STATISTIK</div>
            <div class="header-title" style="font-size: 13pt;">KABUPATEN ${data.kabupatenNama.toUpperCase()}</div>
            <div class="header-sub">Jalan Supadio KM.19,5 No.04/12 Telp. (0561) 724189 Fax (0561) 724189</div>
            <div class="header-sub">E-mail: bps${data.provinsiKode}${data.kabupatenKode}@bps.go.id Homepage: http://${data.kabupatenNama.toLowerCase().replace(/\s+/g, '')}kab.bps.go.id</div>
          </td>
        </tr>
      </table>

      <div class="divider"></div>

      <div class="doc-title">${data.judulBeritaAcara || 'BERITA ACARA PENGGANTIAN SAMPEL SUBSEKTOR BERBEDA'}</div>
      ${data.nomorSurat ? `<div style="text-align: center; margin-top: -8px; margin-bottom: 14px; font-size: 11pt;">Nomor: ${data.nomorSurat}</div>` : ''}

      <div class="narrative">
        ${data.paragrafPembuka || `Sampel Utama Survei Pertanian Terintegrasi (SITASI) ${data.tahun} dengan identitas pada kolom (2) sampai dengan kolom (5) telah dilakukan 4 (empat) tahapan penggantian sampel RTUP, akan tetapi masih belum ditemukan sampel pengganti pada daftar sampel cadangan yang bersesuaian dengan subsektor utama sehingga dilakukan penggantian sampel dengan subsektor yang berbeda seperti tertera pada kolom (6) sampai dengan kolom (9).`}
      </div>

      <table class="meta-table">
        <tr>
          <td style="width: 110px; font-weight: bold;">Provinsi</td>
          <td style="width: 15px;">:</td>
          <td>[${data.provinsiKode}] Provinsi ${data.provinsiNama}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Kabupaten</td>
          <td>:</td>
          <td>[${data.kabupatenKode}] Kabupaten ${data.kabupatenNama}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 5%;">No</th>
            <th colspan="4" style="width: 47%;">Sampel Utama</th>
            <th colspan="4" style="width: 48%;">Sampel Pengganti dengan Subsektor Berbeda</th>
          </tr>
          <tr>
            <th style="width: 11%;">NKS</th>
            <th style="width: 8%;">NUS</th>
            <th style="width: 16%;">Nama KRT/<br>Nama ART Lainnya</th>
            <th style="width: 12%;">Subsektor (Komoditas)</th>
            <th style="width: 11%;">NKS</th>
            <th style="width: 8%;">NUS</th>
            <th style="width: 16%;">Nama KRT/<br>Nama ART Lainnya</th>
            <th style="width: 13%;">Subsektor (Komoditas)</th>
          </tr>
          <tr style="background-color: #fafafa; font-size: 9pt;">
            <th>(1)</th>
            <th>(2)</th>
            <th>(3)</th>
            <th>(4)</th>
            <th>(5)</th>
            <th>(6)</th>
            <th>(7)</th>
            <th>(8)</th>
            <th>(9)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-bottom: 24px;">${data.paragrafPenutup || 'Demikian berita acara ini dibuat dengan sebenar-benarnya.'}</div>

      <div class="sign-section">
        <div>${data.tempat}, ${data.tanggal}</div>
        <div style="font-weight: bold; margin-bottom: 60px;">${data.pejabatJabatan}</div>
        <div style="font-weight: bold; text-decoration: underline;">${data.pejabatNama}</div>
        <div style="font-size: 10pt;">NIP. ${data.pejabatNip}</div>
      </div>
    </body>
    </html>
  `;
}
