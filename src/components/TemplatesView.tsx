import { Save, Trash2 } from 'lucide-react';
import type { SavedTemplate } from '../types';

type TemplatesViewProps = {
  templates: SavedTemplate[];
  selectedTemplateId: string;
  templateName: string;
  builtInTemplateIds: Set<string>;
  canSaveTemplate: boolean;
  onApplyTemplate: (templateId: string) => void;
  onChangeTemplateName: (name: string) => void;
  onSaveTemplate: () => void;
  onDeleteSelectedTemplate: () => void;
};

export function TemplatesView({
  templates,
  selectedTemplateId,
  templateName,
  builtInTemplateIds,
  canSaveTemplate,
  onApplyTemplate,
  onChangeTemplateName,
  onSaveTemplate,
  onDeleteSelectedTemplate,
}: TemplatesViewProps) {
  return (
    <section className="template-section" id="templates">
      <div className="batch-header actions-only">
        <div className="button-cluster">
          <button className="outline-button" type="button" onClick={onDeleteSelectedTemplate} disabled={builtInTemplateIds.has(selectedTemplateId)}>
            <Trash2 size={17} /> Delete Selected
          </button>
        </div>
      </div>

      <div className="panel template-panel">
        <label className="field template-picker">
          <span>Use Template</span>
          <select value={selectedTemplateId} onChange={(event) => onApplyTemplate(event.target.value)}>
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
            onChange={(event) => onChangeTemplateName(event.target.value)}
            placeholder="Warehouse intake label"
          />
        </label>
        <button className="primary-button" type="button" onClick={onSaveTemplate} disabled={!canSaveTemplate}>
          <Save size={18} /> Save Template
        </button>
      </div>
    </section>
  );
}
