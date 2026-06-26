import { Copy, Download, Plus, Printer, Trash2 } from 'lucide-react';
import { LabelSheet } from './LabelSheet';
import type { BatchRow, FormValues, LabelOptions, QrItemPayload } from '../types';

type BatchViewProps = {
  batchRows: BatchRow[];
  batchPayloads: QrItemPayload[];
  labelOptions: LabelOptions;
  customFieldCount: number;
  duplicateScanCodes: Set<string>;
  onAddBlankRow: () => void;
  onDownloadBatchJson: () => void;
  onPrintLabels: () => void;
  onUpdateBatchRow: (id: string, field: keyof FormValues, value: string) => void;
  onDuplicateBatchRow: (row: BatchRow) => void;
  onRemoveBatchRow: (id: string) => void;
  onClearBatch: () => void;
  onUpdateLabelOption: (field: keyof LabelOptions, value: boolean) => void;
  isValidPayloadSource: (values: FormValues) => boolean;
};

export function BatchView({
  batchRows,
  batchPayloads,
  labelOptions,
  customFieldCount,
  duplicateScanCodes,
  onAddBlankRow,
  onDownloadBatchJson,
  onPrintLabels,
  onUpdateBatchRow,
  onDuplicateBatchRow,
  onRemoveBatchRow,
  onClearBatch,
  onUpdateLabelOption,
  isValidPayloadSource,
}: BatchViewProps) {
  return (
    <section className="batch-section" id="batch">
      <div className="batch-header actions-only">
        <div className="button-cluster">
          <button className="ghost-button" type="button" onClick={onAddBlankRow}>
            <Plus size={17} /> Add Row
          </button>
          <button className="outline-button" type="button" onClick={onDownloadBatchJson} disabled={batchPayloads.length === 0}>
            <Download size={18} /> Download All JSON
          </button>
          <button className="primary-button" type="button" onClick={onPrintLabels} disabled={batchPayloads.length === 0}>
            <Printer size={18} /> Print Labels
          </button>
        </div>
      </div>

      <div className="batch-meta">
        <span>{batchRows.length} rows</span>
        <span>{batchPayloads.length} printable labels</span>
        <LabelOption label="Show inventory number" checked={labelOptions.showInventoryNumber} onChange={(checked) => onUpdateLabelOption('showInventoryNumber', checked)} />
        <LabelOption label="Show SKU" checked={labelOptions.showSku} onChange={(checked) => onUpdateLabelOption('showSku', checked)} />
        <LabelOption label="Show quantity on labels" checked={labelOptions.showQuantity} onChange={(checked) => onUpdateLabelOption('showQuantity', checked)} />
        <LabelOption label="Show location" checked={labelOptions.showLocation} onChange={(checked) => onUpdateLabelOption('showLocation', checked)} />
        {customFieldCount > 0 && <span>{customFieldCount} custom fields applied</span>}
        {duplicateScanCodes.size > 0 && (
          <span className="warning-text">Duplicate scan codes: {Array.from(duplicateScanCodes).join(', ')}</span>
        )}
      </div>

      <div className="panel batch-table-wrap">
        <div className="batch-table" role="table" aria-label="Batch QR label rows">
          <div className="batch-row batch-row-head" role="row">
            <span>Scan Code *</span>
            <span>Name</span>
            <span>SKU</span>
            <span>Qty</span>
            <span>Location</span>
            <span>Notes</span>
            <span>Actions</span>
          </div>
          {batchRows.map((row) => {
            const rowIsValid = isValidPayloadSource(row);
            const duplicate = row.scan_code.trim() !== '' && duplicateScanCodes.has(row.scan_code.trim());

            return (
              <div className={`batch-row ${!rowIsValid ? 'is-invalid' : ''} ${duplicate ? 'has-duplicate' : ''}`} role="row" key={row.id}>
                <input
                  aria-label="Batch scan code"
                  value={row.scan_code}
                  onChange={(event) => onUpdateBatchRow(row.id, 'scan_code', event.target.value)}
                  placeholder="INV-2026-000001"
                />
                <input
                  aria-label="Batch item name"
                  value={row.name}
                  onChange={(event) => onUpdateBatchRow(row.id, 'name', event.target.value)}
                  placeholder="Item name"
                />
                <input
                  aria-label="Batch SKU"
                  value={row.sku}
                  onChange={(event) => onUpdateBatchRow(row.id, 'sku', event.target.value)}
                  placeholder="SKU"
                />
                <input
                  aria-label="Batch quantity"
                  type="number"
                  inputMode="decimal"
                  value={row.quantity}
                  onChange={(event) => onUpdateBatchRow(row.id, 'quantity', event.target.value)}
                  placeholder="1"
                />
                <input
                  aria-label="Batch location"
                  value={row.location_name}
                  onChange={(event) => onUpdateBatchRow(row.id, 'location_name', event.target.value)}
                  placeholder="A1-03-05"
                />
                <input
                  aria-label="Batch notes"
                  value={row.notes}
                  onChange={(event) => onUpdateBatchRow(row.id, 'notes', event.target.value)}
                  placeholder="Optional"
                />
                <div className="row-actions">
                  <button className="icon-button" type="button" onClick={() => onDuplicateBatchRow(row)} aria-label={`Duplicate ${row.scan_code || 'row'}`}>
                    <Copy size={16} />
                  </button>
                  <button className="icon-button danger-lite" type="button" onClick={() => onRemoveBatchRow(row.id)} aria-label={`Remove ${row.scan_code || 'row'}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="label-preview-header">
        <h2>Label Preview</h2>
        <button className="ghost-button danger-lite" type="button" onClick={onClearBatch}>
          <Trash2 size={17} /> Clear Batch
        </button>
      </div>
      <LabelSheet payloads={batchPayloads} labelOptions={labelOptions} />
    </section>
  );
}

function LabelOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="label-option">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
