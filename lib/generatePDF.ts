import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateCVPdf(cvText: string, fullName: string, email: string, phone: string, jobTitle: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;
  let y = height;

  // Helper to add new page
  const addPage = () => {
    page = pdfDoc.addPage([595, 842]);
    y = height - 40;
  };

  const checkPage = (needed: number) => {
    if (y - needed < 40) addPage();
  };

  // Header background
  page.drawRectangle({
    x: 0, y: height - 80,
    width, height: 80,
    color: rgb(0.12, 0.35, 0.66),
  });

  // Name
  page.drawText(fullName, {
    x: margin, y: height - 35,
    size: 20, font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  // Job title
  page.drawText(jobTitle, {
    x: margin, y: height - 55,
    size: 11, font: helvetica,
    color: rgb(0.8, 0.9, 1),
  });

  // Contact info
  const contact = `${email}  |  ${phone}`;
  page.drawText(contact, {
    x: margin, y: height - 72,
    size: 9, font: helvetica,
    color: rgb(0.8, 0.9, 1),
  });

  y = height - 100;

  const sectionHeaders = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'AREA OF EXPERTISE', 'EXPERTISE',
    'CAREER EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE',
    'EDUCATION', 'SKILLS', 'CERTIFICATIONS', 'TRAINING & CERTIFICATIONS',
    'LANGUAGES', 'VOLUNTEERING', 'REFERENCES',
  ];

  const cleanText = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();

  const wrapText = (text: string, maxWidth: number, font: any, fontSize: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const lines = cleanText(cvText).split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { y -= 4; continue; }

    const isHeader = sectionHeaders.some(h => line.toUpperCase() === h || line.toUpperCase().startsWith(h));
    const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
    const isJobTitle = !isHeader && !isBullet &&
      (line.includes(' — ') || line.includes(' | ') || line.includes(' at ')) &&
      line.length < 100;

    if (isHeader) {
      checkPage(24);
      y -= 10;
      page.drawText(line, {
        x: margin, y,
        size: 11, font: helveticaBold,
        color: rgb(0.12, 0.35, 0.66),
      });
      y -= 4;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: rgb(0.12, 0.35, 0.66),
      });
      y -= 10;
    } else if (isJobTitle) {
      checkPage(16);
      const wrapped = wrapText(line, contentWidth, helveticaBold, 10);
      for (const wl of wrapped) {
        checkPage(14);
        page.drawText(wl, {
          x: margin, y,
          size: 10, font: helveticaBold,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 14;
      }
    } else if (isBullet) {
      const bulletText = line.replace(/^[•\-*]\s*/, '').trim();
      if (!bulletText || /^-+$/.test(bulletText)) continue;
      const wrapped = wrapText(bulletText, contentWidth - 15, helvetica, 9.5);
      for (let i = 0; i < wrapped.length; i++) {
        checkPage(13);
        if (i === 0) {
          page.drawText('•', { x: margin, y, size: 9.5, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
        }
        page.drawText(wrapped[i], { x: margin + 12, y, size: 9.5, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
        y -= 13;
      }
    } else {
      const wrapped = wrapText(line, contentWidth, helvetica, 9.5);
      for (const wl of wrapped) {
        checkPage(13);
        page.drawText(wl, { x: margin, y, size: 9.5, font: helvetica, color: rgb(0.25, 0.25, 0.25) });
        y -= 13;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateCoverLetterPdf(coverLetter: string, fullName: string, email: string, phone: string, company: string, jobTitle: string, location: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;
  let y = height;

  // Header
  page.drawRectangle({
    x: 0, y: height - 70,
    width, height: 70,
    color: rgb(0.12, 0.35, 0.66),
  });

  page.drawText(fullName, {
    x: margin, y: height - 28,
    size: 18, font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`${email}  |  ${phone}`, {
    x: margin, y: height - 50,
    size: 9, font: helvetica,
    color: rgb(0.8, 0.9, 1),
  });

  y = height - 90;

  // Date
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  page.drawText(date, { x: margin, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
  y -= 20;

  // Company
  page.drawText(company, { x: margin, y, size: 10, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 14;
  page.drawText(location, { x: margin, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
  y -= 24;

  // Subject
  page.drawText(`Re: Application for ${jobTitle}`, {
    x: margin, y,
    size: 11, font: helveticaBold,
    color: rgb(0.12, 0.35, 0.66),
  });
  y -= 20;

  // Body
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = helvetica.widthOfTextAtSize(testLine, 10);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const paragraphs = coverLetter.split('\n\n');
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    const wrapped = wrapText(para.trim(), contentWidth);
    for (const line of wrapped) {
      if (y < 60) break;
      page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: rgb(0.15, 0.15, 0.15) });
      y -= 15;
    }
    y -= 8;
  }

  // Signature
  y -= 10;
  page.drawText('Sincerely,', { x: margin, y, size: 10, font: helvetica, color: rgb(0.15, 0.15, 0.15) });
  y -= 20;
  page.drawText(fullName, { x: margin, y, size: 10, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
