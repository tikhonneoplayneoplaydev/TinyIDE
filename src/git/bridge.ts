// ─── Git bridge: команды git через Rust-бэкенд (любой провайдер) ──────────
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../fs/bridge';

export type GitInfo = { branch: string | null; files: { path: string; status: string }[] };

export type RemoteInfo = {
  url: string | null;
  host: string | null;
  branch: string | null;
  ahead: number;
  behind: number;
};

export async function gitStatus(cwd: string): Promise<GitInfo> {
  if (!isTauri) throw new Error('Git-операции доступны в десктоп-версии (Tauri)');
  return invoke<GitInfo>('git_status', { cwd });
}

export async function gitRemoteInfo(cwd: string): Promise<RemoteInfo> {
  if (!isTauri) throw new Error('Git-операции доступны в десктоп-версии (Tauri)');
  return invoke<RemoteInfo>('git_remote_info', { cwd });
}

export async function gitClone(url: string, parentDir: string): Promise<string> {
  if (!isTauri) throw new Error('Git-операции доступны в десктоп-версии (Tauri)');
  return invoke<string>('git_clone', { url, parentDir });
}

export async function gitPull(cwd: string): Promise<string> {
  if (!isTauri) throw new Error('Git-операции доступны в десктоп-версии (Tauri)');
  return invoke<string>('git_pull', { cwd });
}

export async function gitPush(cwd: string): Promise<string> {
  if (!isTauri) throw new Error('Git-операции доступны в десктоп-версии (Tauri)');
  return invoke<string>('git_push', { cwd });
}

export async function gitCommit(cwd: string, message: string): Promise<string> {
  if (!isTauri) throw new Error('Git-операции доступны в десктоп-версии (Tauri)');
  return invoke<string>('git_commit', { cwd, message });
}

export async function gitInit(cwd: string): Promise<string> {
  if (!isTauri) throw new Error('Git-операции доступны в десктоп-версии (Tauri)');
  return invoke<string>('git_init', { cwd });
}

// ─── определение провайдера по URL ────────────────────────────────────────
export type GitProvider = { name: string; color: string; label: string; host: string };

export function detectProvider(url: string | null): GitProvider {
  if (!url) return { name: 'Git', color: '#f05033', label: 'git', host: '' };
  const u = url.toLowerCase();
  if (u.includes('github')) return { name: 'GitHub', color: '#24292f', label: 'github', host: 'github.com' };
  if (u.includes('gitlab')) return { name: 'GitLab', color: '#fc6d26', label: 'gitlab', host: 'gitlab.com' };
  if (u.includes('bitbucket')) return { name: 'Bitbucket', color: '#0052cc', label: 'bitbucket', host: 'bitbucket.org' };
  if (u.includes('gitea')) return { name: 'Gitea', color: '#609926', label: 'gitea', host: '' };
  if (u.includes('codeberg')) return { name: 'Codeberg', color: '#2185d0', label: 'codeberg', host: 'codeberg.org' };
  if (u.includes('sourceforge')) return { name: 'SourceForge', color: '#ff6600', label: 'sourceforge', host: '' };
  return { name: 'Git', color: '#f05033', label: 'git', host: '' };
}

/** Встраивание токена в URL для приватных репозиториев (по правилам провайдера). */
export function embedToken(url: string, token: string): string {
  const t = token.trim();
  if (!t || !url.startsWith('https://')) return url;
  const u = url.toLowerCase();
  if (u.includes('github')) return url.replace('https://', `https://x-access-token:${t}@`);
  if (u.includes('gitlab')) return url.replace('https://', `https://oauth2:${t}@`);
  return url.replace('https://', `https://${t}@`);
}
