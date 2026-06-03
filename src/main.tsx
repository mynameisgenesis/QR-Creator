import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Check,
  Clipboard,
  Copy,
  Download,
  Layers3,
  Plus,
  Printer,
  QrCode,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './styles.css';

interface QrItemPayload {
  type: 'atlas.inventory.item';
  version: 1;
  scan_code: string;
  name?: string;
  sku?: string;
  quantity?: number;
  location_name?: string;
  notes?: string;
}

type FormValues = {
  scan_code: string;
  name: string;
  sku: string;
  quantity: string;
  location_name: string;
  notes: string;
};

type CopyTarget = 'json' | 'qr' | null;

type BatchRow = FormValues & {
  id: string;
};

const initialValues: FormValues = {
  scan_code: 'INV-2026-000123',
  name: 'Wireless Bluetooth Headphones',
  sku: 'WH-BT-1000XM5',
  quantity: '24',
  location_name: 'A1-03-05',
  notes: 'Over-ear, noise cancelling, black',
};

const sampleBatchRows: BatchRow[] = [
  {
    id: 'row-1',
    scan_code: 'INV-2026-000123',
    name: 'Wireless Bluetooth Headphones',
    sku: 'WH-BT-1000XM5',
    quantity: '24',
    location_name: 'A1-03-05',
    notes: 'Over-ear, noise cancelling, black',
  },
  {
    id: 'row-2',
    scan_code: 'INV-2026-000124',
    name: 'USB-C Charging Cable',
    sku: 'CBL-USBC-2M',
    quantity: '80',
    location_name: 'B2-01-02',
    notes: 'Two meter braided cable',
  },
  {
    id: 'row-3',
    scan_code: 'INV-2026-000125',
    name: 'Adjustable Laptop Stand',
    sku: 'STAND-AL-15',
    quantity: '12',
    location_name: 'C1-05-01',
    notes: '',
  },
];

function createBlankRow(): BatchRow {
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

function textOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildPayload(values: FormValues): QrItemPayload {
  const quantityText = values.quantity.trim();
  const quantity = quantityText === '' ? undefined : Number(quantityText);

  return {
    type: 'atlas.inventory.item',
    version: 1,
    scan_code: values.scan_code.trim(),
    ...(textOrUndefined(values.name) ? { name: values.name.trim() } : {}),
    ...(textOrUndefined(values.sku) ? { sku: values.sku.trim() } : {}),
    ...(Number.isFinite(quantity) ? { quantity } : {}),
    ...(textOrUndefined(values.location_name) ? { location_name: values.location_name.trim() } : {}),
    ...(textOrUndefined(values.notes) ? { notes: values.notes.trim() } : {}),
  };
}

function isValidPayloadSource(values: FormValues) {
  return values.scan_code.trim().length > 0 && (values.quantity.trim() === '' || Number.isFinite(Number(values.quantity)));
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [batchRows, setBatchRows] = useState<BatchRow[]>(sampleBatchRows);
  const [copied, setCopied] = useState<CopyTarget>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  const payload = useMemo(() => buildPayload(values), [values]);
  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const isScanCodeValid = payload.scan_code.length > 0;
  const quantityIsValid = values.quantity.trim() === '' || Number.isFinite(Number(values.quantity));
  const canGenerate = isValidPayloadSource(values);
  const validBatchRows = useMemo(() => batchRows.filter(isValidPayloadSource), [batchRows]);
  const batchPayloads = useMemo(() => validBatchRows.map(buildPayload), [validBatchRows]);
  const duplicateScanCodes = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const row of validBatchRows) {
      const scanCode = row.scan_code.trim();
      if (seen.has(scanCode)) duplicates.add(scanCode);
      seen.add(scanCode);
    }

    return duplicates;
  }, [validBatchRows]);

  function updateField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function copyText(content: string, target: CopyTarget) {
    await navigator.clipboard.writeText(content);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 1400);
  }

  function downloadSvg() {
    const svg = qrWrapRef.current?.querySelector('svg');
    if (!svg || !canGenerate) return;

    const content = new XMLSerializer().serializeToString(svg);
    downloadText(`${payload.scan_code || 'qr-code'}.svg`, content, 'image/svg+xml;charset=utf-8');
  }

  function resetForm() {
    setValues({
      scan_code: '',
      name: '',
      sku: '',
      quantity: '',
      location_name: '',
      notes: '',
    });
  }

  function updateBatchRow(id: string, field: keyof FormValues, value: string) {
    setBatchRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addBlankRow() {
    setBatchRows((current) => [...current, createBlankRow()]);
  }

  function addCurrentItemToBatch() {
    setBatchRows((current) => [...current, { ...values, id: crypto.randomUUID() }]);
  }

  function duplicateBatchRow(row: BatchRow) {
    setBatchRows((current) => [...current, { ...row, id: crypto.randomUUID(), scan_code: `${row.scan_code.trim()}-COPY` }]);
  }

  function removeBatchRow(id: string) {
    setBatchRows((current) => (current.length === 1 ? [createBlankRow()] : current.filter((row) => row.id !== id)));
  }

  function clearBatch() {
    setBatchRows([createBlankRow()]);
  }

  function downloadBatchJson() {
    downloadText('qr-label-payloads.json', JSON.stringify(batchPayloads, null, 2), 'application/json;charset=utf-8');
  }

  function printLabels() {
    window.print();
  }

  return (
    <>
      <main className="app-shell">
        <aside className="sidebar" aria-label="Application navigation">
          <div className="brand">
            <span className="brand-icon"><QrCode size={24} /></span>
            <strong>QR Inventory</strong>
          </div>
          <nav>
            <a className="nav-item active" href="#generator"><QrCode size={18} />Single</a>
            <a className="nav-item" href="#batch"><Layers3 size={18} />Batch Labels</a>
            <a className="nav-item" href="#json"><Clipboard size={18} />JSON</a>
          </nav>
          <div className="tip">
            <AlertCircle size={18} />
            <p>Rows need a scan code before they become printable labels. Duplicate scan codes are flagged before printing.</p>
          </div>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div>
              <p className="section-label">QR Code Generator</p>
              <h1>Create inventory intake QR labels</h1>
            </div>
            <div className="topbar-actions">
              <button className="ghost-button" type="button" onClick={() => setValues(initialValues)}>
                <RefreshCcw size={17} /> Sample
              </button>
              <button className="primary-button" type="button" onClick={printLabels} disabled={batchPayloads.length === 0}>
                <Printer size={18} /> Print Labels
              </button>
            </div>
          </header>

          <div className="content-grid" id="generator">
            <form className="panel form-panel" onSubmit={(event) => event.preventDefault()}>
              <div className="panel-heading">
                <span>1.</span>
                <h2>Enter Item Details</h2>
              </div>

              <label className="field">
                <span>Scan Code <strong>*</strong></span>
                <input
                  value={values.scan_code}
                  onChange={(event) => updateField('scan_code', event.target.value)}
                  placeholder="INV-2026-000001"
                  aria-invalid={!isScanCodeValid}
                />
                <small>Required. This becomes <code>scan_code</code> in the QR payload.</small>
              </label>

              <label className="field">
                <span>Name</span>
                <input
                  value={values.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Item name"
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span>SKU</span>
                  <input
                    value={values.sku}
                    onChange={(event) => updateField('sku', event.target.value)}
                    placeholder="SKU-001"
                  />
                </label>
                <label className="field">
                  <span>Quantity</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={values.quantity}
                    onChange={(event) => updateField('quantity', event.target.value)}
                    placeholder="1"
                    aria-invalid={!quantityIsValid}
                  />
                </label>
              </div>

              <label className="field">
                <span>Location</span>
                <input
                  value={values.location_name}
                  onChange={(event) => updateField('location_name', event.target.value)}
                  placeholder="Warehouse A"
                />
              </label>

              <label className="field">
                <span>Notes</span>
                <textarea
                  value={values.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  maxLength={260}
                  placeholder="Optional notes"
                />
                <small>{values.notes.length} / 260</small>
              </label>

              <div className="form-footer">
                <p><strong>*</strong> Required</p>
                <div className="button-cluster">
                  <button className="ghost-button" type="button" onClick={addCurrentItemToBatch} disabled={!canGenerate}>
                    <Plus size={17} /> Add to Batch
                  </button>
                  <button className="ghost-button danger-lite" type="button" onClick={resetForm}>
                    <Trash2 size={17} /> Clear Form
                  </button>
                </div>
              </div>
            </form>

            <section className="preview-stack">
              <div className="panel qr-panel">
                <div className="panel-heading">
                  <span>2.</span>
                  <h2>QR Code Preview</h2>
                </div>
                <div className="qr-layout">
                  <div className="qr-stage" ref={qrWrapRef} aria-live="polite">
                    {canGenerate ? (
                      <QRCodeSVG value={json} size={292} level="M" includeMargin />
                    ) : (
                      <div className="empty-qr">Enter a scan code</div>
                    )}
                  </div>
                  <dl className="payload-summary">
                    <div><dt>Type</dt><dd>{payload.type}</dd></div>
                    <div><dt>Version</dt><dd>{payload.version}</dd></div>
                    <div><dt>Scan Code</dt><dd>{payload.scan_code || 'Required'}</dd></div>
                    {payload.name && <div><dt>Name</dt><dd>{payload.name}</dd></div>}
                    {payload.sku && <div><dt>SKU</dt><dd>{payload.sku}</dd></div>}
                    {payload.quantity !== undefined && <div><dt>Quantity</dt><dd>{payload.quantity}</dd></div>}
                    {payload.location_name && <div><dt>Location</dt><dd>{payload.location_name}</dd></div>}
                  </dl>
                </div>
                <p className="scan-note">Scan this code with your phone to intake the JSON payload.</p>
              </div>

              <div className="panel json-panel" id="json">
                <div className="json-header">
                  <h2>JSON Preview</h2>
                  <button className="outline-button" type="button" onClick={() => copyText(json, 'json')} disabled={!canGenerate}>
                    {copied === 'json' ? <Check size={17} /> : <Copy size={17} />}
                    {copied === 'json' ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre aria-label="Generated JSON">{json}</pre>
                <div className="action-row">
                  <button className="primary-button" type="button" onClick={downloadSvg} disabled={!canGenerate}>
                    <Download size={18} /> Download SVG
                  </button>
                  <button className="outline-button" type="button" onClick={() => downloadText(`${payload.scan_code || 'payload'}.json`, json, 'application/json;charset=utf-8')} disabled={!canGenerate}>
                    <Download size={18} /> Download JSON
                  </button>
                  <button className="outline-button" type="button" onClick={() => copyText(json, 'qr')} disabled={!canGenerate}>
                    {copied === 'qr' ? <Check size={17} /> : <Clipboard size={17} />}
                    {copied === 'qr' ? 'Copied' : 'Copy QR Data'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section className="batch-section" id="batch">
            <div className="batch-header">
              <div>
                <p className="section-label">Batch Labels</p>
                <h2>Create many labels at once</h2>
              </div>
              <div className="button-cluster">
                <button className="ghost-button" type="button" onClick={addBlankRow}>
                  <Plus size={17} /> Add Row
                </button>
                <button className="outline-button" type="button" onClick={downloadBatchJson} disabled={batchPayloads.length === 0}>
                  <Download size={18} /> Download All JSON
                </button>
                <button className="primary-button" type="button" onClick={printLabels} disabled={batchPayloads.length === 0}>
                  <Printer size={18} /> Print Labels
                </button>
              </div>
            </div>

            <div className="batch-meta">
              <span>{batchRows.length} rows</span>
              <span>{batchPayloads.length} printable labels</span>
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
                        onChange={(event) => updateBatchRow(row.id, 'scan_code', event.target.value)}
                        placeholder="INV-2026-000001"
                      />
                      <input
                        aria-label="Batch item name"
                        value={row.name}
                        onChange={(event) => updateBatchRow(row.id, 'name', event.target.value)}
                        placeholder="Item name"
                      />
                      <input
                        aria-label="Batch SKU"
                        value={row.sku}
                        onChange={(event) => updateBatchRow(row.id, 'sku', event.target.value)}
                        placeholder="SKU"
                      />
                      <input
                        aria-label="Batch quantity"
                        type="number"
                        inputMode="decimal"
                        value={row.quantity}
                        onChange={(event) => updateBatchRow(row.id, 'quantity', event.target.value)}
                        placeholder="1"
                      />
                      <input
                        aria-label="Batch location"
                        value={row.location_name}
                        onChange={(event) => updateBatchRow(row.id, 'location_name', event.target.value)}
                        placeholder="A1-03-05"
                      />
                      <input
                        aria-label="Batch notes"
                        value={row.notes}
                        onChange={(event) => updateBatchRow(row.id, 'notes', event.target.value)}
                        placeholder="Optional"
                      />
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={() => duplicateBatchRow(row)} aria-label={`Duplicate ${row.scan_code || 'row'}`}>
                          <Copy size={16} />
                        </button>
                        <button className="icon-button danger-lite" type="button" onClick={() => removeBatchRow(row.id)} aria-label={`Remove ${row.scan_code || 'row'}`}>
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
              <button className="ghost-button danger-lite" type="button" onClick={clearBatch}>
                <Trash2 size={17} /> Clear Batch
              </button>
            </div>
            <LabelSheet payloads={batchPayloads} />
          </section>
        </section>
      </main>
      <div className="print-only">
        <LabelSheet payloads={batchPayloads} />
      </div>
    </>
  );
}

function LabelSheet({ payloads }: { payloads: QrItemPayload[] }) {
  if (payloads.length === 0) {
    return (
      <div className="label-empty">
        <AlertCircle size={20} />
        Add at least one row with a scan code to preview printable labels.
      </div>
    );
  }

  return (
    <div className="label-sheet" aria-label="Printable QR labels">
      {payloads.map((payload, index) => {
        const labelJson = JSON.stringify(payload);

        return (
          <article className="label-card" key={`${payload.scan_code}-${index}`}>
            <div className="label-qr">
              <QRCodeSVG value={labelJson} size={104} level="M" includeMargin />
            </div>
            <div className="label-copy">
              <strong>{payload.name || payload.scan_code}</strong>
              <span>{payload.scan_code}</span>
              {payload.sku && <span>SKU {payload.sku}</span>}
              {payload.quantity !== undefined && <span>Qty {payload.quantity}</span>}
              {payload.location_name && <span>{payload.location_name}</span>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
