import type { BatchRow, CustomField } from './types';

export function createBlankRow(): BatchRow {
  return {
    id: crypto.randomUUID(),
    scan_code: '',
    name: '',
    sku: '',
    quantity: '',
    location_name: '',
    notes: '',
  };
}

export function createBlankCustomField(): CustomField {
  return {
    id: crypto.randomUUID(),
    key: '',
    value: '',
    valueType: 'text',
  };
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
