/** Opens a print-ready HTML document. User can print or choose "Save as PDF" in the dialog. */
export function openReportPrintWindow(html: string, title: string): void {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    window.alert('Please allow pop-ups to print or save your report.');
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
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
