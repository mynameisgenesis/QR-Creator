import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Download, QrCode, RefreshCcw, Clipboard, Trash2, Copy, Check, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './styles.css';

export interface QrItemPayload {
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

const initialValues: FormValues = {
  scan_code: 'INV-2026-000123',
  name: 'Wireless Bluetooth Headphones',
  sku: 'WH-BT-1000XM5',
  quantity: '24',
  location_name: 'A1-03-05',
  notes: 'Over-ear, noise cancelling, black',
};

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
  const [copied, setCopied] = useState<CopyTarget>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  const payload = useMemo(() => buildPayload(values), [values]);
  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const isScanCodeValid = payload.scan_code.length > 0;
  const quantityIsValid = values.quantity.trim() === '' || Number.isFinite(Number(values.quantity));
  const canGenerate = isScanCodeValid && quantityIsValid;

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

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Application navigation">
        <div className="brand">
          <span className="brand-icon"><QrCode size={24} /></span>
          <strong>QR Inventory</strong>
        </div>
        <nav>
          <a className="nav-item active" href="#generator"><QrCode size={18} />Generate</a>
          <a className="nav-item" href="#json"><Clipboard size={18} />JSON</a>
        </nav>
        <div className="tip">
          <AlertCircle size={18} />
          <p>Keep scan codes unique. Your phone will receive the JSON shown in the preview.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="section-label">QR Code Generator</p>
            <h1>Create inventory intake QR codes</h1>
          </div>
          <button className="ghost-button" type="button" onClick={() => setValues(initialValues)}>
            <RefreshCcw size={17} /> Sample
          </button>
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
              <button className="ghost-button danger-lite" type="button" onClick={resetForm}>
                <Trash2 size={17} /> Clear Form
              </button>
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
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
