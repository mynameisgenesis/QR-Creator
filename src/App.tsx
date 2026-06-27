import { useMemo, useRef, useState } from 'react';
import { Printer, RefreshCcw } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { AuthGate } from './components/AuthGate';
import { BatchView } from './components/BatchView';
import { LabelSheet } from './components/LabelSheet';
import { MobileNavigation, SidebarNavigation } from './components/Navigation';
import { SingleView } from './components/SingleView';
import { TemplatesView } from './components/TemplatesView';
import { supabase } from './lib/supabase';
import { builtInTemplateIds, defaultLabelOptions, defaultTemplate, initialCustomFields, initialValues, sampleBatchRows } from './data';
import { buildPayload, isValidPayloadSource, parseCustomFields } from './payload';
import { readStoredTemplates, writeStoredTemplates } from './storage';
import type { ActiveView, BatchRow, CopyTarget, CustomField, FormValues, LabelOptions, SavedTemplate } from './types';
import { createBlankCustomField, createBlankRow, downloadText } from './utils';

const viewCopy = {
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
};

const oneTimeTemplateId = 'one-time-custom-label';

export function App() {
  return <AuthGate>{(session) => <ProtectedWorkspace session={session} />}</AuthGate>;
}

type ProtectedWorkspaceProps = {
  session: Session;
};

function ProtectedWorkspace({ session }: ProtectedWorkspaceProps) {
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
  const activeViewCopy = viewCopy[activeView];

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

  function startOneTimeCustomLabel() {
    setSelectedTemplateId(oneTimeTemplateId);
    setValues({
      scan_code: '',
      name: '',
      sku: '',
      quantity: '',
      location_name: '',
      notes: '',
    });
    setCustomFields([]);
    setLabelOptions(defaultLabelOptions);
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

  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <>
      <main className="app-shell">
        <SidebarNavigation activeView={activeView} onChangeView={setActiveView} />

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
              <div className="account-menu">
                <span>{session.user.email}</span>
                <button className="outline-button compact-button" type="button" onClick={signOut}>
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          <MobileNavigation activeView={activeView} onChangeView={setActiveView} />

          {activeView === 'single' && (
            <SingleView
              values={values}
              payload={payload}
              json={json}
              isScanCodeValid={isScanCodeValid}
              quantityIsValid={quantityIsValid}
              canGenerate={canGenerate}
              customFields={customFields}
              parsedCustomFields={parsedCustomFields}
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              oneTimeTemplateId={oneTimeTemplateId}
              builtInTemplateIds={builtInTemplateIds}
              copied={copied}
              qrWrapRef={qrWrapRef}
              onApplyTemplate={applyTemplate}
              onStartOneTimeCustomLabel={startOneTimeCustomLabel}
              onUpdateField={updateField}
              onUpdateCustomField={updateCustomField}
              onAddCustomField={addCustomField}
              onRemoveCustomField={removeCustomField}
              onAddCurrentItemToBatch={addCurrentItemToBatch}
              onResetForm={resetForm}
              onDownloadSvg={downloadSvg}
              onDownloadJson={() => downloadText(`${payload.scan_code || 'payload'}.json`, json, 'application/json;charset=utf-8')}
              onCopyText={copyText}
            />
          )}

          {activeView === 'batch' && (
            <BatchView
              batchRows={batchRows}
              batchPayloads={batchPayloads}
              labelOptions={labelOptions}
              customFieldCount={customFields.length}
              duplicateScanCodes={duplicateScanCodes}
              onAddBlankRow={addBlankRow}
              onDownloadBatchJson={downloadBatchJson}
              onPrintLabels={printLabels}
              onUpdateBatchRow={updateBatchRow}
              onDuplicateBatchRow={duplicateBatchRow}
              onRemoveBatchRow={removeBatchRow}
              onClearBatch={clearBatch}
              onUpdateLabelOption={updateLabelOption}
              isValidPayloadSource={isValidPayloadSource}
            />
          )}

          {activeView === 'templates' && (
            <TemplatesView
              templates={templates}
              selectedTemplateId={templates.some((template) => template.id === selectedTemplateId) ? selectedTemplateId : defaultTemplate.id}
              templateName={templateName}
              builtInTemplateIds={builtInTemplateIds}
              canSaveTemplate={templateName.trim().length > 0 && customFieldsAreValid}
              onApplyTemplate={applyTemplate}
              onChangeTemplateName={setTemplateName}
              onSaveTemplate={saveTemplate}
              onDeleteSelectedTemplate={deleteSelectedTemplate}
            />
          )}
        </section>
      </main>
      <div className="print-only">
        <LabelSheet payloads={batchPayloads} labelOptions={labelOptions} />
      </div>
    </>
  );
}
