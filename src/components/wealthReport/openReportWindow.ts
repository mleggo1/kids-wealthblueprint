import { downloadHtmlDocumentAsPdf } from './htmlToPdfDownload';

/** Downloads a .pdf file built from the report HTML (multi-page A4 when needed). */
export function exportReportToPdf(html: string, filename: string): Promise<void> {
  return downloadHtmlDocumentAsPdf(html, filename);
}
