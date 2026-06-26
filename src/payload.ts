import type { CustomField, FormValues, ParsedCustomField, QrItemPayload } from './types';

const reservedPayloadKeys = new Set(['type', 'version', 'scan_code', 'name', 'sku', 'quantity', 'location_name', 'notes']);

function textOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseCustomField(field: CustomField): ParsedCustomField {
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

export function parseCustomFields(fields: CustomField[]) {
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

export function buildPayload(values: FormValues, customFields: ParsedCustomField[] = []): QrItemPayload {
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

export function isValidPayloadSource(values: FormValues) {
  return values.scan_code.trim().length > 0 && (values.quantity.trim() === '' || Number.isFinite(Number(values.quantity)));
}
