<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError, getApi } from "@/api";
import { rememberRevoked } from "@/myShares";
import type { MyShare } from "@/api/types";
import backIcon from "@/assets/onboarding/back.svg";
import { useTelegramButtons } from "@/telegram";

const router = useRouter();
const links = ref<MyShare[]>([]);
const error = ref("");
const loading = ref(true);
const copiedId = ref("");
const pendingId = ref("");

useTelegramButtons(() => ({
  main: null,
  back: () => {
    void router.push({ name: "settings" });
  },
}));

onMounted(async () => {
  try {
    links.value = (await getApi().listShares()).items;
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Ссылки недоступны";
  } finally {
    loading.value = false;
  }
});

function plural(count: number, one: string, few: string, many: string) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 === 1) return one;
  if (n1 > 1 && n1 < 5) return few;
  return many;
}

function ruDate(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

function active(item: MyShare) {
  if (item.revoked_at) return false;
  const expires = new Date(item.expires_at).getTime();
  return !item.expires_at || expires > Date.now();
}

function caption(item: MyShare) {
  if (item.revoked_at) return `Отозвана ${ruDate(item.revoked_at)}`.trim();
  const expires = new Date(item.expires_at).getTime();
  if (item.expires_at && expires <= Date.now())
    return `Срок истёк ${ruDate(item.expires_at)}`.trim();
  const date = ruDate(item.created_at);
  if (item.note && date) return `${item.note} · ${date}`;
  if (item.note) return item.note;
  return date ? `Разбор от ${date}` : "Разбор";
}

function remaining(item: MyShare) {
  if (!active(item) || !item.expires_at) return "";
  const ms = new Date(item.expires_at).getTime() - Date.now();
  const hours = Math.max(1, Math.ceil(ms / 3_600_000));
  if (hours < 24) return `ещё ${hours} ч`;
  const days = Math.ceil(ms / 86_400_000);
  return `ещё ${days} ${plural(days, "день", "дня", "дней")}`;
}

function viewsLabel(count: number) {
  return `${count} ${plural(count, "просмотр", "просмотра", "просмотров")}`;
}

function absoluteUrl(url: string) {
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${location.origin}${import.meta.env.BASE_URL}#${path}`;
}

async function copy(item: MyShare) {
  error.value = "";
  try {
    await navigator.clipboard.writeText(absoluteUrl(item.url));
    copiedId.value = item.id;
  } catch {
    error.value = "Не удалось скопировать ссылку";
  }
}

async function revoke(item: MyShare) {
  error.value = "";
  pendingId.value = item.id;
  try {
    await getApi().revokeShare(item.id);
    item.revoked_at = new Date().toISOString();
    rememberRevoked(item.id);
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Не удалось отозвать ссылку";
  } finally {
    pendingId.value = "";
  }
}
</script>

<template>
  <main class="screen links">
    <header class="pick-head">
      <button class="back" type="button" @click="router.push({ name: 'settings' })">
        <img :src="backIcon" alt="" width="20" height="20" />
      </button>
      <b>Мои ссылки</b>
      <span />
    </header>
    <h1>Мои ссылки</h1>
    <p class="muted">Отзыв сразу закрывает доступ.</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Загружаем ссылки…</p>
    <p v-else-if="!links.length && !error" class="muted">Ссылок пока нет.</p>
    <article v-for="item in links" :key="item.id" class="link-card" :class="{ off: !active(item) }">
      <header>
        <b>{{ item.title }}</b>
        <span class="link-badge" :class="{ off: !active(item) }">{{
          active(item) ? "активна" : item.revoked_at ? "отозвана" : "истекла"
        }}</span>
      </header>
      <p class="muted">{{ caption(item) }}</p>
      <p v-if="active(item)" class="link-meta">
        <span v-if="remaining(item)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="5.25" stroke="currentColor" stroke-width="1.4" />
            <path
              d="M8 5.2V8.2L10 9.4"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
          </svg>
          {{ remaining(item) }}
        </span>
        <span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M1.8 8S3.8 4.6 8 4.6 14.2 8 14.2 8 12.2 11.4 8 11.4 1.8 8 1.8 8Z"
              stroke="currentColor"
              stroke-width="1.4"
            />
            <circle cx="8" cy="8" r="1.7" stroke="currentColor" stroke-width="1.4" />
          </svg>
          {{ viewsLabel(item.views) }}
        </span>
      </p>
      <div v-if="active(item)" class="link-actions">
        <button class="linkish" type="button" @click="copy(item)">
          {{ copiedId === item.id ? "Скопировано" : "Скопировать" }}
        </button>
        <button
          class="link-revoke"
          type="button"
          :disabled="pendingId === item.id"
          @click="revoke(item)"
        >
          Отозвать
        </button>
      </div>
    </article>
  </main>
</template>
