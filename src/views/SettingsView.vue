<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError } from "@/api";
import type { SphereId } from "@/api/types";
import backIcon from "@/assets/onboarding/back.svg";
import chevron from "@/assets/onboarding/chevron.svg";
import { PROFILE_SPHERES } from "@/spheres";
import { useGamificationStore } from "@/stores/gamification";
import { useSessionStore } from "@/stores/session";
import { closeMiniApp } from "@/telegram";

const session = useSessionStore();
const gamification = useGamificationStore();
const router = useRouter();
const login = ref("");
const password = ref("");
const error = ref("");
const message = ref("");
const displayName = computed(() => session.account?.display_name?.trim() ?? "");
const initial = computed(() => displayName.value.slice(0, 1).toUpperCase());
const name = ref(session.account?.display_name ?? "");
const sphere = ref<SphereId | null>(session.account?.spheres[0] ?? null);
const saving = ref(false);

onMounted(() => gamification.hydrate());

function chooseSphere(id: SphereId) {
  sphere.value = id;
}

async function saveProfile() {
  error.value = "";
  message.value = "";
  const displayNameValue = name.value.trim();
  if (!displayNameValue) {
    error.value = "Укажите имя";
    return;
  }
  saving.value = true;
  try {
    await session.saveProfile(displayNameValue, sphere.value ? [sphere.value] : []);
    message.value = "Профиль сохранён";
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Не удалось сохранить";
  } finally {
    saving.value = false;
  }
}

async function upgrade() {
  error.value = "";
  try {
    await session.upgrade(login.value, password.value);
    gamification.hydrate();
    message.value = "Аккаунт теперь постоянный, история та же";
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Не удалось";
  }
}

async function logout() {
  await session.signOut();
  await router.push("/auth");
}

function onToggle() {
  gamification.setEnabled(!gamification.enabled);
}

function openLinks() {
  void router.push({ name: "links" });
}
</script>

<template>
  <main class="screen profile">
    <header class="pick-head">
      <button class="back" type="button" @click="router.push('/scenarios')">
        <img :src="backIcon" alt="" width="20" height="20" />
      </button>
      <b>Профиль</b>
      <span />
    </header>

    <div class="profile-id">
      <span class="profile-avatar" aria-hidden="true">{{ initial }}</span>
      <b>{{ displayName }}</b>
      <b v-if="session.account?.is_guest">Гость</b>
    </div>

    <form class="card profile-form" @submit.prevent="saveProfile">
      <label class="field"
        >Имя<input
          v-model="name"
          name="display_name"
          autocomplete="name"
          placeholder="Введите ваше имя"
      /></label>
      <div class="row profile-spheres">
        <button
          v-for="item in PROFILE_SPHERES"
          :key="item.id"
          type="button"
          class="chip"
          :class="{ on: sphere === item.id }"
          @click="chooseSphere(item.id)"
        >
          {{ item.title }}
        </button>
      </div>
      <button class="btn" type="submit" :disabled="saving">Сохранить</button>
    </form>

    <section class="profile-card">
      <div class="profile-game">
        <div>
          <b>Геймификация</b>
          <p class="muted">Серия и бейджи</p>
        </div>
        <button
          class="toggle"
          :class="{ on: gamification.enabled }"
          type="button"
          :aria-pressed="gamification.enabled"
          aria-label="Геймификация"
          @click="onToggle"
        >
          <i />
        </button>
      </div>
      <button class="profile-link" type="button" @click="openLinks">
        <span>Мои ссылки</span>
        <img :src="chevron" alt="" width="22" height="22" />
      </button>
      <button class="profile-link" type="button" @click="router.push({ name: 'glossary' })">
        <span>Глоссарий метрик</span>
        <img :src="chevron" alt="" width="22" height="22" />
      </button>
      <button class="profile-link" type="button" @click="router.push({ name: 'onboarding' })">
        <span>Пройти обучение заново</span>
        <img :src="chevron" alt="" width="22" height="22" />
      </button>
    </section>

    <!-- <form v-if="session.account?.is_guest" class="card stack" @submit.prevent="upgrade">
      <h2>Стать постоянным пользователем</h2>
      <label class="field">Логин<input v-model="login" required /></label>
      <label class="field">Пароль<input v-model="password" type="password" minlength="6" required /></label>
      <button class="btn" type="submit">Сохранить аккаунт</button>
    </form> -->
    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <!-- <button class="btn ghost" type="button" @click="logout">Выйти</button>
    <button class="btn ghost" type="button" @click="closeMiniApp">Закрыть мини-апп</button> -->
  </main>
</template>
