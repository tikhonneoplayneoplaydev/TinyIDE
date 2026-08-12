import type { Activity, IdeApi } from '../types';
import { FilesIcon, GearIcon, LanguagesIcon, SearchIcon } from './icons';

const ITEMS: { id: Activity; label: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: 'explorer', label: 'Explorer', icon: FilesIcon },
  { id: 'search', label: 'Search', icon: SearchIcon },
  { id: 'languages', label: 'Languages', icon: LanguagesIcon },
  { id: 'settings', label: 'Settings', icon: GearIcon },
];

export default function ActivityBar({ ide }: { ide: IdeApi }) {
  return (
    <div className="activitybar">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const active = ide.activity === id;
        return (
          <button
            key={id}
            className={`activity-btn ${active ? 'active' : ''}`}
            title={label}
            aria-label={label}
            onClick={() => {
              if (active && ide.sidebarOpen) {
                ide.setSidebarOpen(false);
              } else {
                ide.setActivity(id);
                ide.setSidebarOpen(true);
              }
            }}
          >
            <Icon size={22} />
          </button>
        );
      })}
      <div className="activitybar-spacer" />
      <div className="activitybar-bottom">
        <button
          className="activity-btn"
          title="GitHub"
          aria-label="GitHub"
          onClick={() => ide.toast('Исходники: github.com/tikhonneoplayneoplaydev/TinyIDE')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.4 4.7 18.4 5 18.4 5c.6 1.6.2 2.8.1 3.1.7.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
