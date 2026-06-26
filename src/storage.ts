import { builtInTemplateIds, builtInTemplates } from './data';
import type { SavedTemplate } from './types';

const templatesStorageKey = 'qr-creator.templates.v1';

export function readStoredTemplates() {
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

export function writeStoredTemplates(templates: SavedTemplate[]) {
  const userTemplates = templates.filter((template) => !builtInTemplateIds.has(template.id));
  window.localStorage.setItem(templatesStorageKey, JSON.stringify(userTemplates));
}
