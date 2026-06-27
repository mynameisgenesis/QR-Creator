import { useMemo, useState } from 'react';
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { defaultLabelOptions } from '../data';
import { parseCustomFields } from '../payload';
import type { CustomField, CustomFieldType, FormValues, LabelOptions, SavedTemplate, TemplateDraft } from '../types';
import { createBlankCustomField } from '../utils';

type TemplatesViewProps = {
  userTemplates: SavedTemplate[];
  isLoading: boolean;
  error: string | null;
  currentValues: FormValues;
  currentCustomFields: CustomField[];
  currentLabelOptions: LabelOptions;
  onCreateTemplate: (draft: TemplateDraft) => Promise<SavedTemplate>;
  onUpdateTemplate: (templateId: string, draft: TemplateDraft) => Promise<SavedTemplate>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onApplyTemplate: (templateId: string) => void;
};

const blankValues: FormValues = {
  scan_code: '',
  name: '',
  sku: '',
  quantity: '',
  location_name: '',
  notes: '',
};

function createBlankDraft(): TemplateDraft {
  return {
    name: '',
    values: blankValues,
    customFields: [],
    labelOptions: defaultLabelOptions,
  };
}

export function TemplatesView({
  userTemplates,
  isLoading,
  error,
  currentValues,
  currentCustomFields,
  currentLabelOptions,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onApplyTemplate,
}: TemplatesViewProps) {
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TemplateDraft>(createBlankDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const visibleError = localError || error;
  const draftCustomFieldErrors = useMemo(() => parseCustomFields(draft.customFields).filter((field) => field.error), [draft.customFields]);
  const canSave = useMemo(() => draft.name.trim().length > 0 && draftCustomFieldErrors.length === 0 && !isSaving, [draft.name, draftCustomFieldErrors.length, isSaving]);

  function openCreateEditor() {
    setEditorMode('create');
    setEditingTemplateId(null);
    setLocalError(null);
    setDraft(createBlankDraft());
  }

  function openEditEditor(template: SavedTemplate) {
    setEditorMode('edit');
    setEditingTemplateId(template.id);
    setLocalError(null);
    setDraft({
      name: template.name,
      values: template.values,
      customFields: template.customFields,
      labelOptions: template.labelOptions,
    });
  }

  function startFromCurrentLabel() {
    setDraft({
      name: draft.name,
      values: currentValues,
      customFields: currentCustomFields,
      labelOptions: currentLabelOptions,
    });
  }

  function closeEditor() {
    setEditorMode(null);
    setEditingTemplateId(null);
    setLocalError(null);
  }

  async function saveDraft() {
    if (!canSave) return;

    setIsSaving(true);
    setLocalError(null);

    try {
      if (editorMode === 'edit' && editingTemplateId) {
        await onUpdateTemplate(editingTemplateId, {
          ...draft,
          name: draft.name.trim(),
        });
      } else {
        await onCreateTemplate({
          ...draft,
          name: draft.name.trim(),
        });
      }
      closeEditor();
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : 'Unable to save template.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTemplate(templateId: string) {
    setLocalError(null);
    try {
      await onDeleteTemplate(templateId);
    } catch (deleteError) {
      setLocalError(deleteError instanceof Error ? deleteError.message : 'Unable to delete template.');
    }
  }

  return (
    <section className="template-section" id="templates">
      <div className="template-table-header">
        <div>
          <h2>Created Templates</h2>
          <p>Only templates saved by the signed-in user appear here.</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreateEditor}>
          <Plus size={18} /> Create Template
        </button>
      </div>

      {visibleError && <p className="template-error">{visibleError}</p>}

      <div className="panel template-table-wrap">
        <div className="template-table" role="table" aria-label="Created templates">
          <div className="template-row template-row-head" role="row">
            <span>Name</span>
            <span>Fields</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          {isLoading ? (
            <div className="template-empty">Loading templates...</div>
          ) : userTemplates.length === 0 ? (
            <div className="template-empty">No custom templates yet. Create one to save it to your account.</div>
          ) : (
            userTemplates.map((template) => (
              <div className="template-row" role="row" key={template.id}>
                <strong>{template.name}</strong>
                <span>{template.customFields.length} custom fields</span>
                <span>{template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : new Date(template.savedAt).toLocaleDateString()}</span>
                <div className="template-actions">
                  <button className="outline-button compact-button" type="button" onClick={() => onApplyTemplate(template.id)}>
                    Use
                  </button>
                  <button className="icon-button" type="button" onClick={() => openEditEditor(template)} aria-label={`Edit ${template.name}`}>
                    <Edit3 size={16} />
                  </button>
                  <button className="icon-button danger-lite" type="button" onClick={() => deleteTemplate(template.id)} aria-label={`Delete ${template.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editorMode && (
        <TemplateEditorSheet
          mode={editorMode}
          draft={draft}
          isSaving={isSaving}
          canSave={canSave}
          onChangeDraft={setDraft}
          onStartFromCurrentLabel={startFromCurrentLabel}
          onSave={saveDraft}
          onClose={closeEditor}
          customFieldErrors={draftCustomFieldErrors}
        />
      )}
    </section>
  );
}

function TemplateEditorSheet({
  mode,
  draft,
  isSaving,
  canSave,
  onChangeDraft,
  onStartFromCurrentLabel,
  onSave,
  onClose,
  customFieldErrors,
}: {
  mode: 'create' | 'edit';
  draft: TemplateDraft;
  isSaving: boolean;
  canSave: boolean;
  onChangeDraft: (draft: TemplateDraft) => void;
  onStartFromCurrentLabel: () => void;
  onSave: () => void;
  onClose: () => void;
  customFieldErrors: ReturnType<typeof parseCustomFields>;
}) {
  function updateValue(field: keyof FormValues, value: string) {
    onChangeDraft({
      ...draft,
      values: {
        ...draft.values,
        [field]: value,
      },
    });
  }

  function updateCustomField(id: string, updates: Partial<Omit<CustomField, 'id'>>) {
    onChangeDraft({
      ...draft,
      customFields: draft.customFields.map((field) => (field.id === id ? { ...field, ...updates } : field)),
    });
  }

  function addCustomField() {
    onChangeDraft({
      ...draft,
      customFields: [...draft.customFields, createBlankCustomField()],
    });
  }

  function removeCustomField(id: string) {
    onChangeDraft({
      ...draft,
      customFields: draft.customFields.filter((field) => field.id !== id),
    });
  }

  return (
    <div className="sheet-backdrop" role="presentation">
      <section className="template-sheet" aria-label={`${mode === 'create' ? 'Create' : 'Edit'} template`}>
        <div className="sheet-header">
          <div>
            <p className="section-label">{mode === 'create' ? 'New Template' : 'Edit Template'}</p>
            <h2>{mode === 'create' ? 'Create a template from scratch' : 'Update template fields'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close template editor">
            <X size={18} />
          </button>
        </div>

        <div className="sheet-content">
          <label className="field">
            <span>Template Name</span>
            <input
              value={draft.name}
              onChange={(event) => onChangeDraft({ ...draft, name: event.target.value })}
              placeholder="Warehouse intake label"
            />
          </label>

          <div className="sheet-actions-inline">
            <button className="ghost-button" type="button" onClick={onStartFromCurrentLabel}>
              Use Current Label as Starting Point
            </button>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Default Scan Code</span>
              <input value={draft.values.scan_code} onChange={(event) => updateValue('scan_code', event.target.value)} placeholder="INV-2026-000001" />
            </label>
            <label className="field">
              <span>Default Name</span>
              <input value={draft.values.name} onChange={(event) => updateValue('name', event.target.value)} placeholder="Item name" />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Default SKU</span>
              <input value={draft.values.sku} onChange={(event) => updateValue('sku', event.target.value)} placeholder="SKU-001" />
            </label>
            <label className="field">
              <span>Default Quantity</span>
              <input value={draft.values.quantity} onChange={(event) => updateValue('quantity', event.target.value)} placeholder="1" />
            </label>
          </div>

          <label className="field">
            <span>Default Location</span>
            <input value={draft.values.location_name} onChange={(event) => updateValue('location_name', event.target.value)} placeholder="Warehouse A" />
          </label>

          <label className="field">
            <span>Default Notes</span>
            <textarea value={draft.values.notes} onChange={(event) => updateValue('notes', event.target.value)} placeholder="Optional notes" />
          </label>

          <div className="inline-heading">
            <h3>Custom JSON Fields</h3>
            <button className="ghost-button compact-button" type="button" onClick={addCustomField}>
              <Plus size={16} /> Add Field
            </button>
          </div>

          <div className="custom-field-list">
            {draft.customFields.length === 0 ? (
              <p className="muted-copy">Add fields that should appear whenever this template is selected.</p>
            ) : (
              draft.customFields.map((field) => {
                const fieldError = customFieldErrors.find((error) => error.field.id === field.id);

                return (
                <div className={`custom-field-row ${fieldError ? 'has-error' : ''}`} key={field.id}>
                  <input value={field.key} onChange={(event) => updateCustomField(field.id, { key: event.target.value })} placeholder="custom_key" aria-label="Template custom field key" />
                  <select value={field.valueType} onChange={(event) => updateCustomField(field.id, { valueType: event.target.value as CustomFieldType })} aria-label="Template custom field type">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="json">JSON value</option>
                  </select>
                  {field.valueType === 'boolean' ? (
                    <select value={field.value} onChange={(event) => updateCustomField(field.id, { value: event.target.value })} aria-label="Template custom field value">
                      <option value="">Unset</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input value={field.value} onChange={(event) => updateCustomField(field.id, { value: event.target.value })} placeholder="Value" aria-label="Template custom field value" />
                  )}
                  <button className="icon-button danger-lite" type="button" onClick={() => removeCustomField(field.id)} aria-label={`Remove ${field.key || 'custom field'}`}>
                    <Trash2 size={16} />
                  </button>
                  {fieldError?.error && <small>{fieldError.error}</small>}
                </div>
                );
              })
            )}
          </div>
        </div>

        <div className="sheet-footer">
          <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="button" onClick={onSave} disabled={!canSave}>
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </section>
    </div>
  );
}
