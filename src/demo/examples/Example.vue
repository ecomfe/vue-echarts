<template>
  <h2 :id="id">
    <a :href="`#${id}`">
      {{ title }}
      <small v-if="desc">{{ desc }}</small>
    </a>
  </h2>
  <section>
    <figure v-if="!split">
      <slot />
    </figure>
    <template v-else>
      <figure class="half">
        <slot name="start" />
      </figure>
      <figure class="half">
        <slot name="end" />
      </figure>
    </template>
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
