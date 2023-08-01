import { inject } from "@vercel/analytics";
import { createApp } from "vue";
import { createPinia } from "pinia";
import Demo from "./Demo.vue";

inject();

const pinia = createPinia();
const app = createApp(Demo);
app.use(pinia);
app.mount("#app");
