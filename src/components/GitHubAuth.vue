<script setup lang="ts">
// ─── GitHub OAuth: Device Flow (вход без секрета) ─────────────────────────
import { onUnmounted, ref } from 'vue';
import { store } from '../store';
import { isTauri } from '../fs/bridge';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from './AppIcon.vue';

const step = ref<'wait' | 'code' | 'token' | 'done' | 'error'>('wait');
const userCode = ref('');
const verifyUrl = ref('https://github.com/login/device');
const statusMsg = ref('');
const loginName = ref('');
let deviceCode = '';
let timer: number | undefined;
let pollTimer: number | undefined;
let cancelled = false;

// ─── десктоп: Authorization Code Flow + PKCE, локальный сервер :1250 ─────
async function startCodeFlow() {
  cancelled = false;
  step.value = 'wait';
  statusMsg.value = 'Поднимаем локальный сервер на localhost:1250 и открываем браузер…';
  try {
    const res = await invoke('oauth_github_authorize', {
      clientId: store.githubClientId.trim() || store.DEFAULT_GITHUB_CLIENT_ID,
      masterPassword: store.githubMasterPassword || null,
    });
    const r = res as { token: string; login: string };
    loginName.value = r.login;
    store.completeGithubAuth(r.token, r.login);
    step.value = 'done';
    statusMsg.value = '';
    window.setTimeout(() => {
      store.githubAuthOpen = false;
      store.toast('Вы вошли как @' + loginName.value + ' 🎉');
    }, 900);
  } catch (e) {
    step.value = 'error';
    statusMsg.value = String(e);
  }
}

async function start() {
  // Client ID: поле в настройках, иначе вшитый дефолт
  const clientId = store.githubClientId.trim() || store.DEFAULT_GITHUB_CLIENT_ID;
  if (!clientId) return;
  // десктоп — код-флоу через локальный сервер (PKCE, шифрование Argon2+ChaCha20)
  if (isTauri) {
    await startCodeFlow();
    return;
  }
  cancelled = false;
  step.value = 'wait';
  statusMsg.value = 'Запрашиваем код…';
  try {
    let res: { device_code: string; user_code: string; verification_uri: string; interval: number };
    if (isTauri) {
      res = await invoke('oauth_github_start', { clientId });
    } else {
      const r = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: 'client_id=' + encodeURIComponent(clientId) + '&scope=' + encodeURIComponent('repo read:user'),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      res = await r.json();
    }
    deviceCode = res.device_code;
    userCode.value = res.user_code;
    verifyUrl.value = res.verification_uri || 'https://github.com/login/device';
    step.value = 'code';
    statusMsg.value = '';
    const interval = Math.max(5, res.interval || 5);
    pollTimer = window.setInterval(poll, interval * 1000);
  } catch (e) {
    step.value = 'error';
    statusMsg.value = String(e);
    if (!isTauri) {
      statusMsg.value += '\n(вход в веб-версии может быть ограничен CORS — используй десктоп)';
    }
  }
}

async function poll() {
  if (cancelled || !deviceCode) return;
  try {
    let res: { access_token?: string; error?: string; error_description?: string };
    const clientId = store.githubClientId.trim() || store.DEFAULT_GITHUB_CLIENT_ID;
    if (isTauri) {
      res = await invoke('oauth_github_token', {
        clientId,
        deviceCode,
      });
    } else {
      const r = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body:
          'client_id=' + encodeURIComponent(clientId) +
          '&device_code=' + encodeURIComponent(deviceCode) +
          '&grant_type=urn:ietf:params:oauth:grant-type:device_code',
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      res = await r.json();
    }
    if (res.access_token) {
      window.clearInterval(pollTimer);
      step.value = 'token';
      statusMsg.value = 'Получаем профиль…';
      let user: { login?: string } = {};
      try {
        if (isTauri) {
          user = await invoke('github_user', { token: res.access_token });
        } else {
          const r = await fetch('https://api.github.com/user', {
            headers: { Authorization: 'Bearer ' + res.access_token, 'User-Agent': 'TinyIDE' },
          });
          if (r.ok) user = await r.json();
        }
      } catch {
        /* ок */
      }
      loginName.value = user.login ?? 'пользователь';
      store.completeGithubAuth(res.access_token, user.login ?? '');
      step.value = 'done';
      statusMsg.value = '';
      window.setTimeout(() => {
        store.githubAuthOpen = false;
        store.toast('Вы вошли как @' + loginName.value + ' 🎉');
      }, 900);
    } else if (res.error && res.error !== 'authorization_pending' && res.error !== 'slow_down') {
      window.clearInterval(pollTimer);
      step.value = 'error';
      statusMsg.value = res.error_description || res.error;
    }
  } catch (e) {
    window.clearInterval(pollTimer);
    step.value = 'error';
    statusMsg.value = String(e);
  }
}

function openVerify() {
  if (isTauri) {
    invoke('open_url', { url: verifyUrl.value }).catch(() => {});
  } else {
    window.open(verifyUrl.value, '_blank');
  }
}

function close() {
  cancelled = true;
  window.clearInterval(pollTimer);
  window.clearTimeout(timer);
  store.githubAuthOpen = false;
}

onUnmounted(() => {
  cancelled = true;
  window.clearInterval(pollTimer);
  window.clearTimeout(timer);
});

start();
</script>

<template>
  <div class="palette-overlay" @mousedown="close">
    <div class="github-auth" @mousedown.stop>
      <div class="github-auth-head">
        <AppIcon name="github" :size="20" />
        <span>Вход через GitHub</span>
        <button class="bottom-close" style="margin-left: auto" @click="close"><AppIcon name="close" :size="13" /></button>
      </div>

      <template v-if="step === 'wait'">
        <div class="github-auth-body"><span class="tc-dim">{{ statusMsg }}</span></div>
      </template>

      <template v-else-if="step === 'code'">
        <div class="github-auth-body">
          <p>1. Открой <b>github.com/login/device</b></p>
          <p>2. Введи код:</p>
          <div class="github-code">{{ userCode }}</div>
          <button class="btn primary github-open-btn" @click="openVerify">
            <AppIcon name="github" :size="14" /> Открыть github.com/login/device
          </button>
          <p class="tc-dim" style="font-size: 11.5px; margin-top: 8px">
            Ожидаем подтверждение… код действует ~15 минут
          </p>
        </div>
      </template>

      <template v-else-if="step === 'token'">
        <div class="github-auth-body"><span class="tc-cyan">{{ statusMsg }}</span></div>
      </template>

      <template v-else-if="step === 'done'">
        <div class="github-auth-body">
          <div class="github-done">✓</div>
          <p style="font-weight: 700">Вы вошли как @{{ loginName }}</p>
        </div>
      </template>

      <template v-else>
        <div class="github-auth-body">
          <span class="tc-red">Ошибка:</span>
          <pre class="github-err">{{ statusMsg }}</pre>
          <button class="btn git-act" @click="start">Попробовать снова</button>
        </div>
      </template>
    </div>
  </div>
</template>
