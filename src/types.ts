export interface QrItemPayload {
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

export type FormValues = {
  scan_code: string;
  name: string;
  sku: string;
  quantity: string;
  location_name: string;
  notes: string;
};

export type CopyTarget = 'json' | 'qr' | null;
export type ActiveView = 'single' | 'batch' | 'templates';

export type BatchRow = FormValues & {
  id: string;
};

export type CustomFieldType = 'text' | 'number' | 'boolean' | 'json';

export type CustomField = {
  id: string;
  key: string;
  value: string;
  valueType: CustomFieldType;
};

export type LabelOptions = {
  showInventoryNumber: boolean;
  showSku: boolean;
  showQuantity: boolean;
  showLocation: boolean;
};

export type SavedTemplate = {
  id: string;
  name: string;
  values: FormValues;
  customFields: CustomField[];
  labelOptions: LabelOptions;
  savedAt: string;
  updatedAt?: string;
  userId?: string;
};

export type TemplateDraft = {
  name: string;
  values: FormValues;
  customFields: CustomField[];
  labelOptions: LabelOptions;
};

export type ParsedCustomField = {
  field: CustomField;
  value: string | number | boolean | null | undefined;
  error?: string;
};
