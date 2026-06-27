import { supabase } from './lib/supabase';
import type { SavedTemplate, TemplateDraft } from './types';

type TemplateRow = {
  id: string;
  user_id: string;
  name: string;
  values: unknown;
  custom_fields: unknown;
  label_options: unknown;
  created_at: string;
  updated_at: string;
};

function fromRow(row: TemplateRow): SavedTemplate {
  return {
    id: row.id,
    name: row.name,
    values: row.values as SavedTemplate['values'],
    customFields: row.custom_fields as SavedTemplate['customFields'],
    labelOptions: row.label_options as SavedTemplate['labelOptions'],
    savedAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export async function fetchUserTemplates(userId: string) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('qr_templates')
    .select('id,user_id,name,values,custom_fields,label_options,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data as TemplateRow[]).map(fromRow);
}

export async function createUserTemplate(userId: string, draft: TemplateDraft) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('qr_templates')
    .insert({
      user_id: userId,
      name: draft.name,
      values: draft.values,
      custom_fields: draft.customFields,
      label_options: draft.labelOptions,
    })
    .select('id,user_id,name,values,custom_fields,label_options,created_at,updated_at')
    .single();

  if (error) throw error;
  return fromRow(data as TemplateRow);
}

export async function updateUserTemplate(templateId: string, userId: string, draft: TemplateDraft) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('qr_templates')
    .update({
      name: draft.name,
      values: draft.values,
      custom_fields: draft.customFields,
      label_options: draft.labelOptions,
    })
    .eq('id', templateId)
    .eq('user_id', userId)
    .select('id,user_id,name,values,custom_fields,label_options,created_at,updated_at')
    .single();

  if (error) throw error;
  return fromRow(data as TemplateRow);
}

export async function deleteUserTemplate(templateId: string, userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('qr_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId);

  if (error) throw error;
}
