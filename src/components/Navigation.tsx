import { AlertCircle, Layers3, QrCode, Save } from 'lucide-react';
import type { ActiveView } from '../types';

type NavigationProps = {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
};

function NavButtons({ activeView, onChangeView }: NavigationProps) {
  return (
    <>
      <button className={`nav-item ${activeView === 'single' ? 'active' : ''}`} type="button" onClick={() => onChangeView('single')}>
        <QrCode size={18} />Single
      </button>
      <button className={`nav-item ${activeView === 'batch' ? 'active' : ''}`} type="button" onClick={() => onChangeView('batch')}>
        <Layers3 size={18} />Batch Labels
      </button>
      <button className={`nav-item ${activeView === 'templates' ? 'active' : ''}`} type="button" onClick={() => onChangeView('templates')}>
        <Save size={18} />Templates
      </button>
    </>
  );
}

export function SidebarNavigation(props: NavigationProps) {
  return (
    <aside className="sidebar" aria-label="Application navigation">
      <div className="brand">
        <span className="brand-icon"><QrCode size={24} /></span>
        <strong>QR Inventory</strong>
      </div>
      <nav>
        <NavButtons {...props} />
      </nav>
      <div className="tip">
        <AlertCircle size={18} />
        <p>Rows need a scan code before they become printable labels. Duplicate scan codes are flagged before printing.</p>
      </div>
    </aside>
  );
}

export function MobileNavigation(props: NavigationProps) {
  return (
    <nav className="mobile-nav" aria-label="Workspace navigation">
      <NavButtons {...props} />
    </nav>
  );
}
