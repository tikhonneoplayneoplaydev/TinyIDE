// ─── Cursor FX: comet trail, glow aura and typing sparks ────────────────────

import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { Settings } from '../types';

type Props = {
  editorRef: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  settings: Settings;
};

function spawnSparks(container: HTMLElement, at: { x: number; y: number }) {
  for (let i = 0; i < 4; i++) {
    const el = document.createElement('span');
    el.className = 'fx-spark';
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 24;
    el.style.left = at.x + 'px';
    el.style.top = at.y + 'px';
    el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    el.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    el.style.background = i % 2 ? '#a78bfa' : '#67e8f9';
    container.appendChild(el);
    window.setTimeout(() => el.remove(), 700);
  }
}

export default function CursorFX({ editorRef, settings }: Props) {
  const auraRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);
  const sparksRef = useRef<HTMLDivElement | null>(null);
  const sRef = useRef(settings);
  sRef.current = settings;

  useEffect(() => {
    const target = { x: 0, y: 0, vis: false };
    const cur = { x: 0, y: 0 };
    let disposed = false;
    let listeners: monaco.IDisposable[] = [];

    const start = (ed: monaco.editor.IStandaloneCodeEditor) => {
      listeners = [
        ed.onDidChangeCursorPosition((e) => {
          const p = ed.getScrolledVisiblePosition(e.position);
          if (p) {
            target.x = p.left + 1;
            target.y = p.top + p.height / 2;
            target.vis = true;
          }
        }),
        ed.onDidBlurEditorWidget(() => {
          target.vis = false;
        }),
        ed.onDidFocusEditorWidget(() => {
          target.vis = true;
        }),
        ed.onKeyDown((e) => {
          const key = e.browserEvent.key;
          if (
            sRef.current.particles &&
            key.length === 1 &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey &&
            sparksRef.current &&
            target.vis
          ) {
            spawnSparks(sparksRef.current, target);
          }
        }),
      ];

      const loop = () => {
        if (disposed) return;
        const s = sRef.current;
        const aura = auraRef.current;
        const trail = trailRef.current;
        if (aura && trail) {
          if (target.vis) {
            cur.x += (target.x - cur.x) * 0.22;
            cur.y += (target.y - cur.y) * 0.22;
            const t = `translate3d(${cur.x}px, ${cur.y}px, 0) translate(-50%, -50%)`;
            aura.style.transform = t;
            trail.style.transform = t;
          }
          aura.style.opacity = s.glow && target.vis ? '1' : '0';
          trail.style.opacity = s.trail && target.vis ? '0.85' : '0';
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    };

    let raf = 0;
    const waitForEditor = () => {
      if (disposed) return;
      const ed = editorRef.current;
      if (ed) {
        start(ed);
        return;
      }
      raf = requestAnimationFrame(waitForEditor);
    };
    raf = requestAnimationFrame(waitForEditor);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      listeners.forEach((l) => l.dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cursor-fx">
      <div ref={auraRef} className="fx-aura" />
      <div ref={trailRef} className="fx-trail" />
      <div ref={sparksRef} className="fx-sparks" />
    </div>
  );
}
