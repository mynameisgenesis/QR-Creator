import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, RefreshCcw } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { AuthGate } from './components/AuthGate';
import { BatchView } from './components/BatchView';
import { LabelSheet } from './components/LabelSheet';
import { MobileNavigation, SidebarNavigation } from './components/Navigation';
import { SingleView } from './components/SingleView';
import { TemplatesView } from './components/TemplatesView';
import { supabase } from './lib/supabase';
import { builtInTemplateIds, builtInTemplates, defaultLabelOptions, defaultTemplate, initialCustomFields, initialValues, sampleBatchRows } from './data';
import { buildPayload, isValidPayloadSource, parseCustomFields } from './payload';
import { createUserTemplate, deleteUserTemplate, fetchUserTemplates, updateUserTemplate } from './templateService';
import type { ActiveView, BatchRow, CopyTarget, CustomField, FormValues, LabelOptions, SavedTemplate, TemplateDraft } from './types';
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
  const [userTemplates, setUserTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopyTarget>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const allTemplates = useMemo(() => [...builtInTemplates, ...userTemplates], [userTemplates]);

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

  useEffect(() => {
    let isMounted = true;

    async function loadTemplates() {
      setIsLoadingTemplates(true);
      setTemplateError(null);

      try {
        const loadedTemplates = await fetchUserTemplates(session.user.id);
        if (!isMounted) return;
        setUserTemplates(loadedTemplates);
      } catch (error) {
        if (!isMounted) return;
        setTemplateError(error instanceof Error ? error.message : 'Unable to load templates.');
      } finally {
        if (isMounted) setIsLoadingTemplates(false);
      }
    }

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, [session.user.id]);

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
    const template = allTemplates.find((item) => item.id === templateId);
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

  async function createTemplate(draft: TemplateDraft) {
    setTemplateError(null);
    const createdTemplate = await createUserTemplate(session.user.id, draft);
    setUserTemplates((current) => [createdTemplate, ...current]);
    setSelectedTemplateId(createdTemplate.id);
    return createdTemplate;
  }

  async function updateTemplate(templateId: string, draft: TemplateDraft) {
    setTemplateError(null);
    const updatedTemplate = await updateUserTemplate(templateId, session.user.id, draft);
    setUserTemplates((current) => current.map((template) => (template.id === templateId ? updatedTemplate : template)));
    setSelectedTemplateId(updatedTemplate.id);
    return updatedTemplate;
  }

  async function deleteTemplate(templateId: string) {
    if (builtInTemplateIds.has(templateId)) return;

    setTemplateError(null);
    await deleteUserTemplate(templateId, session.user.id);
    setUserTemplates((current) => current.filter((template) => template.id !== templateId));
    if (selectedTemplateId === templateId) {
      applyTemplate(defaultTemplate.id);
    }
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
              templates={allTemplates}
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
              userTemplates={userTemplates}
              isLoading={isLoadingTemplates}
              error={templateError}
              currentValues={values}
              currentCustomFields={customFields}
              currentLabelOptions={labelOptions}
              onCreateTemplate={createTemplate}
              onUpdateTemplate={updateTemplate}
              onDeleteTemplate={deleteTemplate}
              onApplyTemplate={applyTemplate}
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
