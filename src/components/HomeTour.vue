<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { finishHomeTour } from "@/homeTour";

const emit = defineEmits<{ done: [] }>();

type Shape = "pill" | "card" | "nav";

const steps: { selector: string; title: string; body: string; next: string; shape: Shape }[] = [
  {
    selector: '[data-tour="call"]',
    title: "Новые переговоры (пока текстом)",
    body: "Выбираешь сценарий и собеседника, а дальше говоришь голосом (пока текстом)",
    next: "Далее",
    shape: "pill",
  },
  {
    selector: '[data-tour="own"]',
    title: "Свой собеседник",
    body: "Фишка Вершины: копия реального человека — из Cognico или вручную",
    next: "Далее",
    shape: "card",
  },
  {
    selector: '[data-tour="review"]',
    title: "Разбор",
    body: "После переговоров здесь появится итог и три зоны роста.",
    next: "Далее",
    shape: "card",
  },
  {
    selector: '[data-tour="menu"]',
    title: "Меню",
    body: "Главная, тренировки, прогресс и уведомления — всегда внизу.",
    next: "Начать",
    shape: "nav",
  },
];

const index = ref(0);
const ready = ref(false);
const shade = ref({ width: 0, height: 0, d: "" });
const cardBox = ref({ left: 16, width: 320, bottom: 96 });
const cardEl = ref<HTMLElement | null>(null);
const step = computed(() => steps[index.value]);
const clip = computed(() => {
  if (!shade.value.d || !shade.value.width) return "none";
  return `path(evenodd, 'M 0 0 H ${shade.value.width} V ${shade.value.height} H 0 Z ${shade.value.d}')`;
});

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function roundedPath(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h / 2, w / 2);
  return [
    `M ${round(x + radius)} ${round(y)}`,
    `H ${round(x + w - radius)}`,
    `A ${round(radius)} ${round(radius)} 0 0 1 ${round(x + w)} ${round(y + radius)}`,
    `V ${round(y + h - radius)}`,
    `A ${round(radius)} ${round(radius)} 0 0 1 ${round(x + w - radius)} ${round(y + h)}`,
    `H ${round(x + radius)}`,
    `A ${round(radius)} ${round(radius)} 0 0 1 ${round(x)} ${round(y + h - radius)}`,
    `V ${round(y + radius)}`,
    `A ${round(radius)} ${round(radius)} 0 0 1 ${round(x + radius)} ${round(y)}`,
    "Z",
  ].join(" ");
}

function navPath(x: number, y: number, w: number, h: number) {
  const radius = Math.min(34, w / 2, h);
  return [
    `M ${round(x + radius)} ${round(y)}`,
    `H ${round(x + w - radius)}`,
    `A ${round(radius)} ${round(radius)} 0 0 1 ${round(x + w)} ${round(y + radius)}`,
    `V ${round(y + h)}`,
    `H ${round(x)}`,
    `V ${round(y + radius)}`,
    `A ${round(radius)} ${round(radius)} 0 0 1 ${round(x + radius)} ${round(y)}`,
    "Z",
  ].join(" ");
}

function measure() {
  const current = step.value;
  const target = document.querySelector(current.selector);
  const phone = document.querySelector(".phone");
  const nav = document.querySelector(".nav");
  if (!(target instanceof HTMLElement) || !(phone instanceof HTMLElement)) return;
  const rect = target.getBoundingClientRect();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const d =
    current.shape === "nav"
      ? navPath(rect.left, rect.top, rect.width, rect.height)
      : roundedPath(
          rect.left,
          rect.top,
          rect.width,
          rect.height,
          current.shape === "pill" ? rect.height / 2 : 22,
        );
  shade.value = { width, height, d };
  const phoneRect = phone.getBoundingClientRect();
  const navTop = nav instanceof HTMLElement ? nav.getBoundingClientRect().top : height - 76;
  const cardHeight = cardEl.value?.offsetHeight ?? 196;
  let bottom = height - navTop + 12;
  const cardTop = height - bottom - cardHeight;
  const overlaps = cardTop < rect.bottom + 8 && cardTop + cardHeight > rect.top;
  if (overlaps && current.shape !== "nav") {
    const belowTop = rect.bottom + 12;
    if (belowTop + cardHeight < navTop - 8) bottom = height - belowTop - cardHeight;
    else bottom = height - rect.top + 12;
  }
  cardBox.value = {
    left: phoneRect.left + 16,
    width: Math.max(220, phoneRect.width - 32),
    bottom,
  };
  ready.value = true;
}

async function measureSoon() {
  await nextTick();
  measure();
  await nextTick();
  measure();
}

function close() {
  finishHomeTour();
  emit("done");
}

function next() {
  if (index.value >= steps.length - 1) {
    close();
    return;
  }
  index.value += 1;
}

watch(index, () => {
  void measureSoon();
});

let phone: HTMLElement | null = null;
const observer = new ResizeObserver(() => measure());

onMounted(() => {
  phone = document.querySelector(".phone");
  phone?.setAttribute("inert", "");
  if (phone) observer.observe(phone);
  document.body.style.overflow = "hidden";
  window.addEventListener("resize", measure);
  window.addEventListener("scroll", measure, true);
  void measureSoon();
});

onBeforeUnmount(() => {
  phone?.removeAttribute("inert");
  observer.disconnect();
  document.body.style.overflow = "";
  window.removeEventListener("resize", measure);
  window.removeEventListener("scroll", measure, true);
});
</script>

<template>
  <Teleport to="body">
    <div
      class="home-tour"
      :style="{ visibility: ready ? 'visible' : 'hidden' }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-tour-title"
    >
      <div class="home-tour-shade" :style="{ clipPath: clip }" />
      <section
        ref="cardEl"
        class="home-tour-card"
        :style="{
          left: `${cardBox.left}px`,
          width: `${cardBox.width}px`,
          bottom: `${cardBox.bottom}px`,
        }"
      >
        <div class="home-tour-meta">
          <span class="home-tour-dots" aria-hidden="true">
            <i v-for="(_, dot) in steps" :key="dot" :class="{ on: dot === index }" />
          </span>
          <span>{{ index + 1 }} из {{ steps.length }}</span>
        </div>
        <h2 id="home-tour-title">{{ step.title }}</h2>
        <p>{{ step.body }}</p>
        <div class="home-tour-actions">
          <button type="button" class="home-tour-skip" @click="close">Пропустить</button>
          <button type="button" class="home-tour-next" @click="next">{{ step.next }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.home-tour-shade {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(8, 15, 32, 0.72);
}

.home-tour-card {
  position: fixed;
  z-index: 81;
  background: #fff;
  border-radius: 28px;
  padding: 18px 18px 16px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
}

.home-tour-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #a1a1aa;
  font-size: 13px;
  line-height: 16px;
  font-weight: 600;
}

.home-tour-dots {
  display: flex;
  align-items: center;
  gap: 5px;
}

.home-tour-dots i {
  width: 6px;
  height: 6px;
  border-radius: 99px;
  background: #d4d4d8;
}

.home-tour-dots i.on {
  width: 18px;
  background: #1a5cff;
}

.home-tour-card h2 {
  margin-top: 14px;
  font-size: 20px;
  line-height: 26px;
  letter-spacing: -0.4px;
}

.home-tour-card p {
  margin-top: 8px;
  color: #3f3f46;
  font-size: 15px;
  line-height: 21px;
  font-weight: 400;
}

.home-tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
}

.home-tour-skip {
  border: 0;
  background: none;
  padding: 8px 2px;
  color: #71717a;
  font-size: 15px;
  font-weight: 600;
}

.home-tour-next {
  height: 40px;
  padding: 0 22px;
  border: 0;
  border-radius: 999px;
  background: #1a5cff;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
</style>
