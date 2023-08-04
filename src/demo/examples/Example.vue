<template>
  <h2 :id="id">
    <a :href="`#${id}`">
      {{ title }}
      <small v-if="desc"
        ><slot v-if="$slots.desc" /><template v-else>{{
          desc
        }}</template></small
      >
    </a>
    <button
      class="round"
      :class="{ expand }"
      @click="expand = !expand"
      aria-label="toggle"
    ></button>
  </h2>
  <section v-if="expand">
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

<script>
export default {
  name: "v-example",
  props: {
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
  },
  data() {
    return {
      expand: true
    };
  }
};
</script>
