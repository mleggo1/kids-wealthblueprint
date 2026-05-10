import html2canvas from 'html2canvas';

/** Rasterize a DOM node (e.g. chart card) for embedding in the PDF report. */
export async function captureElementAsPngDataUrl(el: HTMLElement | null): Promise<string | null> {
  if (!el) return null;
  el.scrollIntoView({ behavior: 'auto', block: 'center' });
  await new Promise<void>((r) => setTimeout(r, 200));
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}
