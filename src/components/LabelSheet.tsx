import { AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { LabelOptions, QrItemPayload } from '../types';

type LabelSheetProps = {
  payloads: QrItemPayload[];
  labelOptions: LabelOptions;
};

export function LabelSheet({ payloads, labelOptions }: LabelSheetProps) {
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
