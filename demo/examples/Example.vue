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
  gap: var(--space-2);
  margin-top: 0.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-1) * 1.5);
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
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: calc(var(--space-1) * 2);
}

.actions > * {
  margin: 0;
}

.actions input[type="checkbox"] {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.actions input[type="checkbox"] + label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: 0 var(--space-2);
  height: 2.25rem;
  border-radius: var(--r-m);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--heading);
  font-size: 0.9rem;
  font-weight: 500;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.actions input[type="checkbox"] + label::before {
  content: "";
  width: 1.25rem;
  height: 1.25rem;
  border-radius: calc(var(--r-s) * 0.9);
  border: 2px solid color-mix(in srgb, var(--accent) 35%, var(--border) 65%);
  background-color: var(--surface);
  background-repeat: no-repeat;
  background-position: center;
  background-size: 95%;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    background-image 0.2s ease;
}

.actions input[type="checkbox"] + label:hover {
  border-color: var(--border);
  background: var(--surface-2);
}

.actions input[type="checkbox"]:checked + label {
  border-color: color-mix(in srgb, var(--accent) 70%, var(--border) 30%);
  color: var(--accent-strong);
}

.actions input[type="checkbox"]:checked + label::before {
  border-color: var(--accent-strong);
  background-color: var(--accent-strong);
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20fill='%23ffffff'%20d='M13.6%204.2a.75.75%200%2000-1.2-.9L6.8%2010%204.1%207.3a.75.75%200%2010-1.2%201l3.2%203.2c.3.3.8.3%201.1%200l6.4-7.3Z'/%3E%3C/svg%3E");
}

.actions input[type="checkbox"]:focus-visible + label {
  outline: none;
  border-color: var(--accent);
  outline: 2px solid color-mix(in srgb, var(--accent) 45%, transparent);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .actions {
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .actions button,
  .actions select,
  .actions input[type="checkbox"] + label {
    width: auto;
    min-width: min(150px, 100%);
    font-size: 0.84rem;
    height: 2.25rem;
  }

  .actions select {
    text-align-last: center;
  }

  .actions button,
  .actions select {
    padding-inline: var(--space-2);
  }

  .actions input[type="checkbox"] + label {
    padding: 0 var(--space-2);
  }
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
      margin-left: calc(var(--space-1) * 7.5);
    }
  }
}
</style>
