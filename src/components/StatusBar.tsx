import { useEffect, useState } from 'react';
import type { IdeApi } from '../types';
import { BranchIcon, CheckIcon, CometIcon, MoonIcon, SunIcon, SyncIcon, TerminalIcon, WarnIcon } from './icons';

export default function StatusBar({ ide }: { ide: IdeApi }) {
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  useEffect(() => {
    return ide.cursorEmitter.subscribe(setCursor);
  }, [ide]);

  const active = ide.openFiles.find((f) => f.path === ide.activePath);
  const dirtyCount = Object.values(ide.dirty).filter(Boolean).length;

  return (
    <div className="statusbar">
      <div className="status-left">
        <span className="status-item" title="Ветка">
          <BranchIcon /> main
        </span>
        <span className="status-item" title="Синхронизация">
          <SyncIcon /> 0↓ 0↑
        </span>
        <span className="status-item" title="Ошибки и предупреждения">
          <CheckIcon /> 0
        </span>
        <span className="status-item warn" title="Предупреждения">
          <WarnIcon /> {dirtyCount || 0}
        </span>
      </div>
      <div className="status-right">
        <span className="status-item status-click" onClick={() => ide.toast('TinyIDE v0.3.0 — Tauri 2 · React · Monaco · AGPL-3.0')}>
          {active ? active.language : 'Plain Text'}
        </span>
        <span className="status-item">Ln {cursor.line}, Col {cursor.col}</span>
        <span className="status-item">Spaces: {ide.settings.tabSize}</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">LF</span>
        <button
          className={`status-btn ${ide.settings.trail ? 'on' : ''}`}
          title="Курсор-комета: вкл/выкл"
          onClick={() => ide.updateSettings({ trail: !ide.settings.trail })}
        >
          <CometIcon />
        </button>
        <button
          className={`status-btn ${ide.panelOpen ? 'on' : ''}`}
          title="Терминал (Ctrl+`)"
          onClick={() => {
            ide.setPanelOpen(!ide.panelOpen);
            if (!ide.panelOpen) ide.setPanelTab('terminal');
          }}
        >
          <TerminalIcon size={15} />
        </button>
        <button
          className="status-btn"
          title="Переключить тему"
          onClick={() => ide.updateSettings({ theme: ide.settings.theme === 'dark' ? 'light' : 'dark' })}
        >
          {ide.settings.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </div>
  );
}
