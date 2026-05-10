import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_WIDTH_PX = 794; // ~210mm at 96dpi — matches print CSS width

/**
 * Renders a full HTML document to a multi-page A4 PDF (no clipping: each page shows the next vertical slice).
 */
export async function downloadHtmlDocumentAsPdf(html: string, filename: string): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.title = 'pdf-export';
  iframe.style.cssText = `position:fixed;left:-12000px;top:0;width:${A4_WIDTH_PX}px;height:4000px;border:0;opacity:0;pointer-events:none`;

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    throw new Error('Could not create PDF rendering frame');
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') resolve();
    else iframe.onload = () => resolve();
  });

  const root = doc.documentElement;
  const body = doc.body;
  const fullHeight = Math.max(body.scrollHeight, body.offsetHeight, root.scrollHeight, root.offsetHeight);
  iframe.style.height = `${Math.ceil(fullHeight + 40)}px`;

  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  await new Promise<void>((r) => setTimeout(r, 280));

  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  try {
    const canvas = await html2canvas(body, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: body.scrollWidth,
      height: body.scrollHeight,
      windowWidth: body.scrollWidth,
      windowHeight: body.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const imgWidth = pageWidth - margin * 2;
    const innerH = pageHeight - margin * 2;

    const imgHeightTotal = (canvas.height * imgWidth) / canvas.width;
    const pxPerPdfPage = (innerH / imgWidth) * canvas.width;

    if (imgHeightTotal <= innerH) {
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeightTotal);
    } else {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) throw new Error('Canvas not supported');

      let sy = 0;
      while (sy < canvas.height) {
        const slicePx = Math.min(pxPerPdfPage, canvas.height - sy);
        pageCanvas.height = Math.ceil(slicePx);
        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(canvas, 0, sy, canvas.width, slicePx, 0, 0, pageCanvas.width, pageCanvas.height);
        const pageImg = pageCanvas.toDataURL('image/png');
        const slicePdfH = (slicePx * imgWidth) / canvas.width;
        pdf.addImage(pageImg, 'PNG', margin, margin, imgWidth, slicePdfH);
        sy += slicePx;
        if (sy < canvas.height) pdf.addPage();
      }
    }

    pdf.save(safeName);
  } finally {
    document.body.removeChild(iframe);
  }
}
