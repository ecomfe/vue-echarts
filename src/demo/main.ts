import { createApp } from "vue";
import { createPinia } from "pinia";
import Demo from "./Demo.vue";

const pinia = createPinia();
const app = createApp(Demo);
app.use(pinia);
app.mount("#app");
