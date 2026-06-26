import type { RefObject } from 'react';
import { Check, Clipboard, Copy, Download, Plus, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { CopyTarget, CustomField, CustomFieldType, FormValues, ParsedCustomField, QrItemPayload } from '../types';

type SingleViewProps = {
  values: FormValues;
  payload: QrItemPayload;
  json: string;
  isScanCodeValid: boolean;
  quantityIsValid: boolean;
  canGenerate: boolean;
  customFields: CustomField[];
  parsedCustomFields: ParsedCustomField[];
  copied: CopyTarget;
  qrWrapRef: RefObject<HTMLDivElement | null>;
  onUpdateField: (field: keyof FormValues, value: string) => void;
  onUpdateCustomField: (id: string, updates: Partial<Omit<CustomField, 'id'>>) => void;
  onAddCustomField: () => void;
  onRemoveCustomField: (id: string) => void;
  onAddCurrentItemToBatch: () => void;
  onResetForm: () => void;
  onDownloadSvg: () => void;
  onDownloadJson: () => void;
  onCopyText: (content: string, target: CopyTarget) => void;
};

export function SingleView({
  values,
  payload,
  json,
  isScanCodeValid,
  quantityIsValid,
  canGenerate,
  customFields,
  parsedCustomFields,
  copied,
  qrWrapRef,
  onUpdateField,
  onUpdateCustomField,
  onAddCustomField,
  onRemoveCustomField,
  onAddCurrentItemToBatch,
  onResetForm,
  onDownloadSvg,
  onDownloadJson,
  onCopyText,
}: SingleViewProps) {
  return (
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
            onChange={(event) => onUpdateField('scan_code', event.target.value)}
            placeholder="INV-2026-000001"
            aria-invalid={!isScanCodeValid}
          />
          <small>Required. This becomes <code>scan_code</code> in the QR payload.</small>
        </label>

        <label className="field">
          <span>Name</span>
          <input
            value={values.name}
            onChange={(event) => onUpdateField('name', event.target.value)}
            placeholder="Item name"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>SKU</span>
            <input
              value={values.sku}
              onChange={(event) => onUpdateField('sku', event.target.value)}
              placeholder="SKU-001"
            />
          </label>
          <label className="field">
            <span>Quantity</span>
            <input
              type="number"
              inputMode="decimal"
              value={values.quantity}
              onChange={(event) => onUpdateField('quantity', event.target.value)}
              placeholder="1"
              aria-invalid={!quantityIsValid}
            />
          </label>
        </div>

        <label className="field">
          <span>Location</span>
          <input
            value={values.location_name}
            onChange={(event) => onUpdateField('location_name', event.target.value)}
            placeholder="Warehouse A"
          />
        </label>

        <label className="field">
          <span>Notes</span>
          <textarea
            value={values.notes}
            onChange={(event) => onUpdateField('notes', event.target.value)}
            maxLength={260}
            placeholder="Optional notes"
          />
          <small>{values.notes.length} / 260</small>
        </label>

        <CustomFieldsEditor
          customFields={customFields}
          parsedCustomFields={parsedCustomFields}
          onAddCustomField={onAddCustomField}
          onUpdateCustomField={onUpdateCustomField}
          onRemoveCustomField={onRemoveCustomField}
        />

        <div className="form-footer">
          <p><strong>*</strong> Required</p>
          <div className="button-cluster">
            <button className="ghost-button" type="button" onClick={onAddCurrentItemToBatch} disabled={!canGenerate}>
              <Plus size={17} /> Add to Batch
            </button>
            <button className="ghost-button danger-lite" type="button" onClick={onResetForm}>
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
            <button className="outline-button" type="button" onClick={() => onCopyText(json, 'json')} disabled={!canGenerate}>
              {copied === 'json' ? <Check size={17} /> : <Copy size={17} />}
              {copied === 'json' ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <pre aria-label="Generated JSON">{json}</pre>
          <div className="action-row">
            <button className="primary-button" type="button" onClick={onDownloadSvg} disabled={!canGenerate}>
              <Download size={18} /> Download SVG
            </button>
            <button className="outline-button" type="button" onClick={onDownloadJson} disabled={!canGenerate}>
              <Download size={18} /> Download JSON
            </button>
            <button className="outline-button" type="button" onClick={() => onCopyText(json, 'qr')} disabled={!canGenerate}>
              {copied === 'qr' ? <Check size={17} /> : <Clipboard size={17} />}
              {copied === 'qr' ? 'Copied' : 'Copy QR Data'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CustomFieldsEditor({
  customFields,
  parsedCustomFields,
  onAddCustomField,
  onUpdateCustomField,
  onRemoveCustomField,
}: {
  customFields: CustomField[];
  parsedCustomFields: ParsedCustomField[];
  onAddCustomField: () => void;
  onUpdateCustomField: (id: string, updates: Partial<Omit<CustomField, 'id'>>) => void;
  onRemoveCustomField: (id: string) => void;
}) {
  return (
    <section className="custom-field-section">
      <div className="inline-heading">
        <h3>Custom JSON Fields</h3>
        <button className="ghost-button compact-button" type="button" onClick={onAddCustomField}>
          <Plus size={16} /> Add Field
        </button>
      </div>
      {customFields.length === 0 ? (
        <p className="muted-copy">Add custom keys when this QR needs fields beyond the inventory template.</p>
      ) : (
        <div className="custom-field-list">
          {customFields.map((field) => {
            const parsedField = parsedCustomFields.find((parsed) => parsed.field.id === field.id);

            return (
              <div className={`custom-field-row ${parsedField?.error ? 'has-error' : ''}`} key={field.id}>
                <input
                  aria-label="Custom field key"
                  value={field.key}
                  onChange={(event) => onUpdateCustomField(field.id, { key: event.target.value })}
                  placeholder="custom_key"
                />
                <select
                  aria-label="Custom field type"
                  value={field.valueType}
                  onChange={(event) => onUpdateCustomField(field.id, { valueType: event.target.value as CustomFieldType })}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON value</option>
                </select>
                {field.valueType === 'boolean' ? (
                  <select
                    aria-label="Custom field value"
                    value={field.value}
                    onChange={(event) => onUpdateCustomField(field.id, { value: event.target.value })}
                  >
                    <option value="">Unset</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    aria-label="Custom field value"
                    value={field.value}
                    onChange={(event) => onUpdateCustomField(field.id, { value: event.target.value })}
                    placeholder={field.valueType === 'json' ? '"value"' : 'Value'}
                  />
                )}
                <button className="icon-button danger-lite" type="button" onClick={() => onRemoveCustomField(field.id)} aria-label={`Remove ${field.key || 'custom field'}`}>
                  <Trash2 size={16} />
                </button>
                {parsedField?.error && <small>{parsedField.error}</small>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
