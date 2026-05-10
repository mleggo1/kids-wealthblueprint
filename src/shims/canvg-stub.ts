/**
 * jsPDF dynamically imports `canvg` for addSvgAsImage (SVG → canvas).
 * This app only uses raster PNGs from html2canvas, so a stub keeps Vite/Rollup
 * from pulling core-js and the full canvg tree.
 */
export default {
  fromString() {
    return {
      render: () => Promise.resolve(),
    };
  },
};
