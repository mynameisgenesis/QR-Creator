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
  Save,
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
  [key: string]: string | number | boolean | null | undefined;
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
type ActiveView = 'single' | 'batch' | 'templates';

type BatchRow = FormValues & {
  id: string;
};

type CustomFieldType = 'text' | 'number' | 'boolean' | 'json';

type CustomField = {
  id: string;
  key: string;
  value: string;
  valueType: CustomFieldType;
};

type LabelOptions = {
  showInventoryNumber: boolean;
  showSku: boolean;
  showQuantity: boolean;
  showLocation: boolean;
};

type SavedTemplate = {
  id: string;
  name: string;
  values: FormValues;
  customFields: CustomField[];
  labelOptions: LabelOptions;
  savedAt: string;
};

type ParsedCustomField = {
  field: CustomField;
  value: string | number | boolean | null | undefined;
  error?: string;
};

const reservedPayloadKeys = new Set(['type', 'version', 'scan_code', 'name', 'sku', 'quantity', 'location_name', 'notes']);
const templatesStorageKey = 'qr-creator.templates.v1';

const initialValues: FormValues = {
  scan_code: 'INV-2026-000123',
  name: 'Wireless Bluetooth Headphones',
  sku: 'WH-BT-1000XM5',
  quantity: '24',
  location_name: 'A1-03-05',
  notes: 'Over-ear, noise cancelling, black',
};

const initialCustomFields: CustomField[] = [];

const defaultLabelOptions: LabelOptions = {
  showInventoryNumber: true,
  showSku: true,
  showQuantity: true,
  showLocation: true,
};

const builtInTemplates: SavedTemplate[] = [{
  id: 'starter-inventory-item',
  name: 'Atlas Inventory Item',
  values: initialValues,
  customFields: initialCustomFields,
  labelOptions: defaultLabelOptions,
  savedAt: new Date(0).toISOString(),
}, {
  id: 'starter-basic-asset-tag',
  name: 'Basic Asset Tag',
  values: {
    scan_code: 'ASSET-2026-0001',
    name: 'Company Laptop',
    sku: '',
    quantity: '1',
    location_name: 'IT Closet',
    notes: 'Assigned equipment',
  },
  customFields: [{
    id: 'asset-owner',
    key: 'owner',
    value: 'Unassigned',
    valueType: 'text',
  }, {
    id: 'asset_status',
    key: 'asset_status',
    value: 'active',
    valueType: 'text',
  }],
  labelOptions: {
    showInventoryNumber: true,
    showSku: false,
    showQuantity: false,
    showLocation: true,
  },
  savedAt: new Date(0).toISOString(),
}, {
  id: 'starter-storage-bin',
  name: 'Storage Bin',
  values: {
    scan_code: 'BIN-A1-001',
    name: 'Storage Bin A1',
    sku: '',
    quantity: '',
    location_name: 'Aisle A1',
    notes: 'Mixed inventory container',
  },
  customFields: [{
    id: 'bin-zone',
    key: 'zone',
    value: 'A',
    valueType: 'text',
  }, {
    id: 'requires_count',
    key: 'requires_count',
    value: 'true',
    valueType: 'boolean',
  }],
  labelOptions: {
    showInventoryNumber: true,
    showSku: false,
    showQuantity: false,
    showLocation: true,
  },
  savedAt: new Date(0).toISOString(),
}, {
  id: 'starter-maintenance-check',
  name: 'Maintenance Check',
  values: {
    scan_code: 'MAINT-2026-0001',
    name: 'Maintenance Inspection',
    sku: '',
    quantity: '',
    location_name: 'Warehouse Floor',
    notes: 'Scan before service',
  },
  customFields: [{
    id: 'maintenance_type',
    key: 'maintenance_type',
    value: 'inspection',
    valueType: 'text',
  }, {
    id: 'priority',
    key: 'priority',
    value: 'normal',
    valueType: 'text',
  }],
  labelOptions: {
    showInventoryNumber: true,
    showSku: false,
    showQuantity: false,
    showLocation: true,
  },
  savedAt: new Date(0).toISOString(),
}];

const builtInTemplateIds = new Set(builtInTemplates.map((template) => template.id));
const defaultTemplate = builtInTemplates[0];

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

function parseCustomField(field: CustomField): ParsedCustomField {
  const key = field.key.trim();

  if (key.length === 0) {
    return { field, value: undefined };
  }

  if (reservedPayloadKeys.has(key)) {
    return { field, value: undefined, error: `${key} is already managed by the base form.` };
  }

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return { field, value: undefined, error: 'Use letters, numbers, and underscores. Start with a letter or underscore.' };
  }

  const rawValue = field.value.trim();
  if (rawValue.length === 0) {
    return { field, value: undefined };
  }

  if (field.valueType === 'number') {
    const numberValue = Number(rawValue);
    return Number.isFinite(numberValue)
      ? { field, value: numberValue }
      : { field, value: undefined, error: `${key} must be a valid number.` };
  }

  if (field.valueType === 'boolean') {
    return { field, value: rawValue === 'true' };
  }

  if (field.valueType === 'json') {
    try {
      const parsed = JSON.parse(rawValue) as string | number | boolean | null;
      const isSupportedJsonValue = parsed === null || ['string', 'number', 'boolean'].includes(typeof parsed);
      return isSupportedJsonValue
        ? { field, value: parsed }
        : { field, value: undefined, error: `${key} must be a JSON string, number, boolean, or null.` };
    } catch {
      return { field, value: undefined, error: `${key} must contain valid JSON.` };
    }
  }

  return { field, value: rawValue };
}

function parseCustomFields(fields: CustomField[]) {
  return fields.map(parseCustomField);
}

function buildCustomPayloadFields(parsedFields: ParsedCustomField[]) {
  return parsedFields.reduce<Record<string, string | number | boolean | null>>((fields, parsed) => {
    const key = parsed.field.key.trim();

    if (parsed.error || key.length === 0 || parsed.value === undefined) {
      return fields;
    }

    return {
      ...fields,
      [key]: parsed.value,
    };
  }, {});
}

function buildPayload(values: FormValues, customFields: ParsedCustomField[] = []): QrItemPayload {
  const quantityText = values.quantity.trim();
  const quantity = quantityText === '' ? undefined : Number(quantityText);
  const extraFields = buildCustomPayloadFields(customFields);

  return {
    type: 'atlas.inventory.item',
    version: 1,
    scan_code: values.scan_code.trim(),
    ...(textOrUndefined(values.name) ? { name: values.name.trim() } : {}),
    ...(textOrUndefined(values.sku) ? { sku: values.sku.trim() } : {}),
    ...(Number.isFinite(quantity) ? { quantity } : {}),
    ...(textOrUndefined(values.location_name) ? { location_name: values.location_name.trim() } : {}),
    ...(textOrUndefined(values.notes) ? { notes: values.notes.trim() } : {}),
    ...extraFields,
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

function createBlankCustomField(): CustomField {
  return {
    id: crypto.randomUUID(),
    key: '',
    value: '',
    valueType: 'text',
  };
}

function readStoredTemplates() {
  try {
    const stored = window.localStorage.getItem(templatesStorageKey);
    if (!stored) return builtInTemplates;

    const parsed = JSON.parse(stored) as SavedTemplate[];
    return [
      ...builtInTemplates,
      ...parsed.filter((template) => !builtInTemplateIds.has(template.id)),
    ];
  } catch {
    return builtInTemplates;
  }
}

function writeStoredTemplates(templates: SavedTemplate[]) {
  const userTemplates = templates.filter((template) => !builtInTemplateIds.has(template.id));
  window.localStorage.setItem(templatesStorageKey, JSON.stringify(userTemplates));
}

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('single');
  const [values, setValues] = useState<FormValues>(initialValues);
  const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);
  const [batchRows, setBatchRows] = useState<BatchRow[]>(sampleBatchRows);
  const [labelOptions, setLabelOptions] = useState<LabelOptions>(defaultLabelOptions);
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => readStoredTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);
  const [templateName, setTemplateName] = useState('');
  const [copied, setCopied] = useState<CopyTarget>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  const parsedCustomFields = useMemo(() => parseCustomFields(customFields), [customFields]);
  const customFieldErrors = parsedCustomFields.filter((parsed) => parsed.error);
  const payload = useMemo(() => buildPayload(values, parsedCustomFields), [values, parsedCustomFields]);
  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const isScanCodeValid = payload.scan_code.length > 0;
  const quantityIsValid = values.quantity.trim() === '' || Number.isFinite(Number(values.quantity));
  const customFieldsAreValid = customFieldErrors.length === 0;
  const canGenerate = isValidPayloadSource(values) && customFieldsAreValid;
  const validBatchRows = useMemo(() => batchRows.filter(isValidPayloadSource), [batchRows]);
  const batchPayloads = useMemo(
    () => validBatchRows.map((row) => buildPayload(row, parsedCustomFields)),
    [parsedCustomFields, validBatchRows],
  );
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
  const activeViewCopy = {
    single: {
      label: 'QR Code Generator',
      title: 'Create inventory intake QR labels',
    },
    batch: {
      label: 'Batch Labels',
      title: 'Create many labels at once',
    },
    templates: {
      label: 'Templates',
      title: 'Save reusable QR setups',
    },
  }[activeView];

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

  function updateCustomField(id: string, updates: Partial<Omit<CustomField, 'id'>>) {
    setCustomFields((current) => current.map((field) => (field.id === id ? { ...field, ...updates } : field)));
  }

  function addCustomField() {
    setCustomFields((current) => [...current, createBlankCustomField()]);
  }

  function removeCustomField(id: string) {
    setCustomFields((current) => current.filter((field) => field.id !== id));
  }

  function updateLabelOption(field: keyof LabelOptions, value: boolean) {
    setLabelOptions((current) => ({ ...current, [field]: value }));
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    setSelectedTemplateId(templateId);
    setValues(template.values);
    setCustomFields(template.customFields);
    setLabelOptions(template.labelOptions);
  }

  function saveTemplate() {
    const name = templateName.trim();
    if (name.length === 0) return;

    const template: SavedTemplate = {
      id: crypto.randomUUID(),
      name,
      values,
      customFields,
      labelOptions,
      savedAt: new Date().toISOString(),
    };
    const nextTemplates = [...templates, template];
    setTemplates(nextTemplates);
    writeStoredTemplates(nextTemplates);
    setSelectedTemplateId(template.id);
    setTemplateName('');
  }

  function deleteSelectedTemplate() {
    if (builtInTemplateIds.has(selectedTemplateId)) return;

    const nextTemplates = templates.filter((template) => template.id !== selectedTemplateId);
    setTemplates(nextTemplates);
    writeStoredTemplates(nextTemplates);
    applyTemplate(defaultTemplate.id);
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
            <button className={`nav-item ${activeView === 'single' ? 'active' : ''}`} type="button" onClick={() => setActiveView('single')}>
              <QrCode size={18} />Single
            </button>
            <button className={`nav-item ${activeView === 'batch' ? 'active' : ''}`} type="button" onClick={() => setActiveView('batch')}>
              <Layers3 size={18} />Batch Labels
            </button>
            <button className={`nav-item ${activeView === 'templates' ? 'active' : ''}`} type="button" onClick={() => setActiveView('templates')}>
              <Save size={18} />Templates
            </button>
          </nav>
          <div className="tip">
            <AlertCircle size={18} />
            <p>Rows need a scan code before they become printable labels. Duplicate scan codes are flagged before printing.</p>
          </div>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div>
              <p className="section-label">{activeViewCopy.label}</p>
              <h1>{activeViewCopy.title}</h1>
            </div>
            <div className="topbar-actions">
              {activeView === 'single' && (
                <button className="ghost-button" type="button" onClick={() => setValues(initialValues)}>
                  <RefreshCcw size={17} /> Sample
                </button>
              )}
              {activeView === 'batch' && (
                <button className="primary-button" type="button" onClick={printLabels} disabled={batchPayloads.length === 0}>
                  <Printer size={18} /> Print Labels
                </button>
              )}
            </div>
          </header>

          <nav className="mobile-nav" aria-label="Workspace navigation">
            <button className={`nav-item ${activeView === 'single' ? 'active' : ''}`} type="button" onClick={() => setActiveView('single')}>
              <QrCode size={18} />Single
            </button>
            <button className={`nav-item ${activeView === 'batch' ? 'active' : ''}`} type="button" onClick={() => setActiveView('batch')}>
              <Layers3 size={18} />Batch Labels
            </button>
            <button className={`nav-item ${activeView === 'templates' ? 'active' : ''}`} type="button" onClick={() => setActiveView('templates')}>
              <Save size={18} />Templates
            </button>
          </nav>

          {activeView === 'single' && (
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

              <section className="custom-field-section">
                <div className="inline-heading">
                  <h3>Custom JSON Fields</h3>
                  <button className="ghost-button compact-button" type="button" onClick={addCustomField}>
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
                            onChange={(event) => updateCustomField(field.id, { key: event.target.value })}
                            placeholder="custom_key"
                          />
                          <select
                            aria-label="Custom field type"
                            value={field.valueType}
                            onChange={(event) => updateCustomField(field.id, { valueType: event.target.value as CustomFieldType })}
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
                              onChange={(event) => updateCustomField(field.id, { value: event.target.value })}
                            >
                              <option value="">Unset</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          ) : (
                            <input
                              aria-label="Custom field value"
                              value={field.value}
                              onChange={(event) => updateCustomField(field.id, { value: event.target.value })}
                              placeholder={field.valueType === 'json' ? '"value"' : 'Value'}
                            />
                          )}
                          <button className="icon-button danger-lite" type="button" onClick={() => removeCustomField(field.id)} aria-label={`Remove ${field.key || 'custom field'}`}>
                            <Trash2 size={16} />
                          </button>
                          {parsedField?.error && <small>{parsedField.error}</small>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

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
          )}

          {activeView === 'batch' && (
          <section className="batch-section" id="batch">
            <div className="batch-header actions-only">
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
              <label className="label-option">
                <input
                  type="checkbox"
                  checked={labelOptions.showInventoryNumber}
                  onChange={(event) => updateLabelOption('showInventoryNumber', event.target.checked)}
                />
                Show inventory number
              </label>
              <label className="label-option">
                <input
                  type="checkbox"
                  checked={labelOptions.showSku}
                  onChange={(event) => updateLabelOption('showSku', event.target.checked)}
                />
                Show SKU
              </label>
              <label className="label-option">
                <input
                  type="checkbox"
                  checked={labelOptions.showQuantity}
                  onChange={(event) => updateLabelOption('showQuantity', event.target.checked)}
                />
                Show quantity on labels
              </label>
              <label className="label-option">
                <input
                  type="checkbox"
                  checked={labelOptions.showLocation}
                  onChange={(event) => updateLabelOption('showLocation', event.target.checked)}
                />
                Show location
              </label>
              {customFields.length > 0 && <span>{customFields.length} custom fields applied</span>}
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
            <LabelSheet
              payloads={batchPayloads}
              labelOptions={labelOptions}
            />
          </section>
          )}

          {activeView === 'templates' && (
          <section className="template-section" id="templates">
            <div className="batch-header actions-only">
              <div className="button-cluster">
                <button className="outline-button" type="button" onClick={deleteSelectedTemplate} disabled={builtInTemplateIds.has(selectedTemplateId)}>
                  <Trash2 size={17} /> Delete Selected
                </button>
              </div>
            </div>

            <div className="panel template-panel">
              <label className="field template-picker">
                <span>Use Template</span>
                <select value={selectedTemplateId} onChange={(event) => applyTemplate(event.target.value)}>
                  {templates.map((template) => (
                    <option value={template.id} key={template.id}>
                      {template.name}{builtInTemplateIds.has(template.id) ? ' (built-in)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field template-name-field">
                <span>New Template Name</span>
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Warehouse intake label"
                />
              </label>
              <button className="primary-button" type="button" onClick={saveTemplate} disabled={templateName.trim().length === 0 || !customFieldsAreValid}>
                <Save size={18} /> Save Template
              </button>
            </div>
          </section>
          )}
        </section>
      </main>
      <div className="print-only">
        <LabelSheet
          payloads={batchPayloads}
          labelOptions={labelOptions}
        />
      </div>
    </>
  );
}

function LabelSheet({
  payloads,
  labelOptions,
}: {
  payloads: QrItemPayload[];
  labelOptions: LabelOptions;
}) {
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
              <strong>{payload.name || (labelOptions.showInventoryNumber ? payload.scan_code : 'Inventory item')}</strong>
              {labelOptions.showInventoryNumber && <span>{payload.scan_code}</span>}
              {labelOptions.showSku && payload.sku && <span>SKU {payload.sku}</span>}
              {labelOptions.showQuantity && payload.quantity !== undefined && <span>Qty {payload.quantity}</span>}
              {labelOptions.showLocation && payload.location_name && <span>{payload.location_name}</span>}
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
