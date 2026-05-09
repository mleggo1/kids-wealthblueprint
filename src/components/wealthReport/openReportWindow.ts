/** Opens a print-ready HTML document. User can print or choose "Save as PDF" in the dialog. */
export function openReportPrintWindow(html: string, title: string): void {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    window.alert('Please allow pop-ups for this site, then try again.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  w.focus();
  requestAnimationFrame(() => {
    setTimeout(() => {
      w.print();
    }, 220);
  });
}

/** Dedicated PDF action (opens print dialog with Save as PDF selected by user). */
export function exportReportToPdf(html: string, title: string): void {
  openReportPrintWindow(html, title);
}

export function downloadReportHtml(html: string, filename: string): void {
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Failed to download HTML report', error);
    window.alert('Download failed in this browser. Trying a new tab instead.');
    const fallback = window.open('', '_blank', 'noopener,noreferrer');
    if (!fallback) return;
    fallback.document.open();
    fallback.document.write(html);
    fallback.document.close();
  }
}
