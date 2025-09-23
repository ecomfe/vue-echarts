<script setup lang="ts">
import { computed } from "vue";

interface ExampleProps {
  id: string;
  title: string;
  desc?: string | string[];
  split?: boolean;
}

const props = defineProps<ExampleProps>();

const badges = computed<string[]>(() => {
  const { desc } = props;
  if (!desc) {
    return [];
  }
  if (Array.isArray(desc)) {
    return desc.map((value) => value.trim()).filter(Boolean);
  }

  let text = desc.trim();
  const wrapped = text.match(/^\s*\((.*)\)\s*$/);
  if (wrapped) {
    text = wrapped[1];
  }

  return text
    .split(/\s*·\s*|\s*,\s*|\s*&\s*|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
});
</script>

<template>
  <h3 :id="id">
    <a :href="`#${id}`">{{ title }}</a>
  </h3>
  <div v-if="badges.length" class="badges">
    <span v-for="(b, i) in badges" :key="i" class="badge">{{ b }}</span>
  </div>
  <section>
    <figure v-if="!split" class="fig hero">
      <slot />
    </figure>
    <div v-else class="split">
      <figure class="fig half">
        <slot name="start" />
      </figure>
      <figure class="fig half">
        <slot name="end" />
      </figure>
    </div>
    <slot name="extra" />
  </section>
</template>

<style>
.fig {
  display: flex;
  justify-content: center;
  width: fit-content;
  margin: 2rem auto;

  & > .echarts {
    width: min(calc(64vw + 4rem), 980px);
    height: 360px;
    max-width: 980px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-l);
    box-shadow: none;
  }
}

.badges {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 0.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.26rem 0.72rem;
  font-weight: 500;
  font-size: 0.78rem;
  line-height: 1;
  color: var(--text);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface-2) 70%);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border) 60%);
  border-radius: 999px;
  white-space: nowrap;
}

.badge::before {
  content: "#";
  display: inline-block;
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1;
  color: var(--accent);
}

.split {
  display: flex;
  justify-content: center;

  .fig {
    margin-right: 0;
    margin-left: 0;
  }
}

.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 0.5rem;
}

@media (max-width: 980px) {
  .fig {
    width: 100%;
    margin: 1rem auto;

    .echarts {
      width: 100%;
      min-width: 0;
      height: 64vw;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }
  }
}

@media (min-width: 980px) {
  .fig.half {
    .echarts {
      width: 32vw;
      min-width: 280px;
      height: 180px;
    }

    & + & {
      margin-left: 30px;
    }
  }
}
</style>
