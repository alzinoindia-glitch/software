export const getInvoicePrintZoom = (contentHeightPx, printableHeightPx) => {
  const contentHeight = Number(contentHeightPx);
  const printableHeight = Number(printableHeightPx);
  if (!Number.isFinite(contentHeight) || contentHeight <= 0 || !Number.isFinite(printableHeight) || printableHeight <= 0) {
    return 1;
  }
  return Math.min(1, printableHeight / contentHeight);
};
