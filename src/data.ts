import type { BatchRow, CustomField, FormValues, LabelOptions, SavedTemplate } from './types';

export const initialValues: FormValues = {
  scan_code: 'INV-2026-000123',
  name: 'Wireless Bluetooth Headphones',
  sku: 'WH-BT-1000XM5',
  quantity: '24',
  location_name: 'A1-03-05',
  notes: 'Over-ear, noise cancelling, black',
};

export const initialCustomFields: CustomField[] = [];

export const defaultLabelOptions: LabelOptions = {
  showInventoryNumber: true,
  showSku: true,
  showQuantity: true,
  showLocation: true,
};

export const builtInTemplates: SavedTemplate[] = [{
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

export const builtInTemplateIds = new Set(builtInTemplates.map((template) => template.id));
export const defaultTemplate = builtInTemplates[0];

export const sampleBatchRows: BatchRow[] = [
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
