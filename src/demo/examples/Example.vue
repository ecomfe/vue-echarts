<template>
  <h2 :id="id">
    <a :href="`#${id}`">
      {{ title }}
      <small v-if="desc">{{ desc }}</small>
    </a>
  </h2>
  <section>
    <figure class="fig hero" v-if="!split">
      <slot />
    </figure>
    <div class="split" v-else>
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

<script setup>
import { defineProps } from "vue";

defineProps({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  desc: String,
  split: Boolean
});
</script>

<style>
.fig {
  display: flex;
  justify-content: center;
  width: fit-content;
  margin: 2em auto;

  .echarts {
    width: calc(60vw + 4em);
    height: 360px;
    max-width: 720px;
    padding: 1.5em 2em;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    box-shadow: 0 0 45px rgba(0, 0, 0, 0.2);
  }
}

.split {
  display: flex;
  justify-content: center;

  .fig {
    margin-right: 0;
    margin-left: 0;
  }
}

@media (max-width: 980px) {
  .fig {
    width: 100vw;
    margin: 1em auto;

    .echarts {
      width: 100%;
      min-width: 0;
      height: 60vw;
      padding: 1em 0;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }
  }
}

@media (min-width: 980px) {
  .fig.half {
    .echarts {
      width: 28vw;
      min-width: 240px;
      padding: 1em 1.5em;
      height: 180px;
    }

    & + & {
      margin-left: 30px;
    }
  }
}
</style>
