<script setup lang="ts">
import { collectBadges } from '@/gamification/badges'
import type { Badge } from '@/gamification/badges'

defineProps<{ badges: Badge[] }>()
</script>

<template>
  <div class="badges">
    <article v-for="badge in badges" :key="badge.id" class="badge" :class="{ earned: badge.earned }">
      <b>{{ badge.title }}</b>
      <span class="muted">{{ badge.earned ? badge.hint : 'Пока закрыт' }}</span>
    </article>
  </div>
</template>
