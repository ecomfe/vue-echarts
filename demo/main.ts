import { inject } from "@vercel/analytics";
import { createApp } from "vue";
import { createPinia } from "pinia";
import Demo from "./Demo.vue";

const SAMPLE_RATE = 0.5;

inject({
  beforeSend: event => {
    if (Math.random() > SAMPLE_RATE) {
      return null;
    }

    return event;
  }
});

const pinia = createPinia();
const app = createApp(Demo);
app.use(pinia);
app.mount("#app");
