// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";

import HomeComponent from "../components/HomeComponent.vue";
import FfmpegEffects from "../components/FfmpegEffects.vue";
import Save2Video from "../components/Save2Video.vue";
import VideoAudioFilters from "../components/VideoAudioFilters.vue";
import SaveFilterVideo from "../components/SaveFilterVideo.vue";
import SaveWithRecoding from "../components/SaveWithRecoding.vue";
import SharedBufferWorker from "../components/SharedBufferWorker.vue";
import SaveWorker from "../components/SaveWorker.vue";
import CameraWeb from "../components/CameraWeb.vue";
import SavewithSlider from "../components/SavewithSlider.vue";
import VideoWithSound from "../components/VideoWithSound.vue";
import SaveComponent9 from "../components/SaveComponent9.vue";
import SaveCom10 from "../components/SaveCom10.vue";
import SaveCom11 from "../components/SaveCom11.vue";
import SaveCom12 from "../components/SaveCom12.vue";
import CutVideo from "../components/CutVideo.vue";
import CutVideo2 from "../components/CutVideo2.vue";


const routes = [
  {
    path: "/",
    name: "ffmpegFilters",
    component: HomeComponent,
  },
  {
    path: "/save1",
    name: "save1",
    component: SaveWithRecoding,
  },
  {
    path: "/save3",
    name: "save3",
    component: FfmpegEffects,
  },
  {
    path: "/save4",
    name: "save4",
    component: SaveWorker,
  },
  {
    path: "/save6",
    name: "save6",
    component: CameraWeb,
  },
  {
    path: "/save7",
    name: "save7",
    component: SavewithSlider,
  },
  {
    path: "/save8",
    name: "save8",
    component: VideoWithSound,
  },
  {
    path: "/save9",
    name: "save9",
    component: SaveComponent9,
  },
  {
    path: "/save10",
    name: "save10",
    component: SaveCom10,
  },
  {
    path: "/save11",
    name: "save11",
    component: SaveCom11,
  },
  {
    path: "/save12",
    name: "save12",
    component: SaveCom12,
  },
  {
    path: "/save13",
    name: "CutVideo",
    component: CutVideo,
  },
  {
    path: "/save14",
    name: "CutVideo2",
    component: CutVideo2,
  },
  {
    path: "/save5",
    name: "save5",
    component: SharedBufferWorker,
  },
  {
    path: "/save2",
    name: "save2",
    component: Save2Video,
  },
  {
    path: "/audio-filters",
    name: "audioFilters",
    component: VideoAudioFilters,
  },
  {
    path: "/save-filters",
    name: "saveFilters",
    component: SaveFilterVideo,
  },
];
const router = createRouter({
  history: createWebHistory(),
  linkActiveClass: "active_link",
  routes,
});
export default router;
