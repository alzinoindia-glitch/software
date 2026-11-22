import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const printTemplates = readFileSync(new URL('../src/components/PrintTemplates.jsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/components/ExecutiveDashboard.jsx', import.meta.url), 'utf8');

test('A4 invoice print isolates the app and constrains the document to one page', () => {
  assert.match(printTemplates, /createPortal\(\(/);
  assert.match(css, /body\.print-document-mode > #root\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.print-container\.print-invoice-a4\s*\{[^}]*page:\s*invoice-a4/s);
  assert.match(css, /\.print-container\.print-invoice-a4\s*\{[^}]*height:\s*297mm/s);
  assert.match(css, /\.invoice-a4-sheet\s*\{[^}]*zoom:\s*var\(--invoice-print-zoom/s);
});

test('day report print reveals the dashboard and hides its action buttons', () => {
  assert.match(dashboard, /dashboard-report-print/);
  assert.match(dashboard, /dashboard-report-no-print/);
  assert.match(css, /body\.dashboard-report-print-mode \.dashboard-report-print,\s*body\.dashboard-report-print-mode \.dashboard-report-print \*/);
  assert.match(css, /\.dashboard-report-no-print\s*\{\s*display:\s*none/s);
});
