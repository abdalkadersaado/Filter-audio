<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <video ref="video" controls></video>
    <div v-if="videoSrc">
      <label>Start Time (seconds):</label>
      <input type="number" v-model.number="startTime" min="0" />
      <label>End Time (seconds):</label>
      <input type="number" v-model.number="endTime" min="0" />
      <button @click="cutVideo">Cut Video</button>
    </div>
  </div>
</template>

<script>
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

export default {
  data() {
    return {
      videoSrc: "",
      startTime: 0,
      endTime: 30,
      ffmpeg: null,
    };
  },
  async created() {
    this.ffmpeg = createFFmpeg({ log: true });
    await this.ffmpeg.load();
  },
  methods: {
    handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.videoSrc = URL.createObjectURL(file);
        this.$refs.video.src = this.videoSrc;
      }
    },
    async cutVideo() {
      const { startTime, endTime } = this;
      if (!this.videoSrc || endTime <= startTime) return;

      const videoFile = await fetchFile(this.videoSrc);

      // تحميل الفيديو إلى ffmpeg.wasm
      this.ffmpeg.FS("writeFile", "input.mp4", new Uint8Array(videoFile));

      // حساب مدة القطع
      const duration = endTime - startTime;

      // تنفيذ عملية القطع
      await this.ffmpeg.run(
        "-ss",
        `${startTime}`,
        "-i",
        "input.mp4",
        "-t",
        `${duration}`,
        "-c",
        "copy",
        "output.mp4"
      );

      // قراءة ملف الفيديو المقطوع
      const data = this.ffmpeg.FS("readFile", "output.mp4");
      const videoBlob = new Blob([data.buffer], { type: "video/mp4" });
      const videoUrl = URL.createObjectURL(videoBlob);

      // عرض الفيديو المقطوع
      const cutVideo = document.createElement("video");
      cutVideo.src = videoUrl;
      cutVideo.controls = true;
      document.body.appendChild(cutVideo);
    },
  },
};
</script>
