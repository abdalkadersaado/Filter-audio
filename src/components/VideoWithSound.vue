<template>
  <div>
    <input type="file" @change="handleFileUpload" accept="video/*" />

    <video ref="video" controls></video>

    <button @click="playSound">Play Sound</button>

    <button @click="mergeAudioWithVideo">Merge Audio with Video</button>

    <!-- زر لتحميل الفيديو النهائي -->
    <button v-if="outputUrl" @click="downloadVideo">Download Video</button>

    <!-- قائمة لاختيار الفلتر الصوتي -->
    <select v-model="selectedFilter">
      <option value="none">None</option>
      <option value="lowpass">Lowpass Filter</option>
      <option value="highpass">Highpass Filter</option>
      <option value="bandpass">Bandpass Filter</option>
      <option value="notch">Notch Filter</option>
      <option value="peaking">Peaking Filter</option>
      <option value="allpass">Allpass Filter</option>
    </select>
  </div>
</template>

<script>
import { Howl } from "howler";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

export default {
  data() {
    return {
      videoFile: null,
      ffmpeg: null,
      sound: null,
      outputUrl: null,
      processing: false,
      progress: 0,
      selectedFilter: 'none', // الفلتر الصوتي المحدد
      audioContext: null,
      source: null,
      filter: null,
      audioBuffer: null,
    };
  },
  watch: {
    selectedFilter(newFilter) {
      if (this.audioContext && this.audioBuffer) {
        this.applyFilter(newFilter);
      }
    }
  },
  methods: {
    async loadFFmpeg() {
      if (!this.ffmpeg) {
        this.ffmpeg = createFFmpeg({ log: true });
        await this.ffmpeg.load();
      }
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (file && file.type.startsWith("video/")) {
        this.videoFile = file;

        // إعداد الصوت وتطبيق الفلتر المحدد باستخدام Web Audio API
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = await this.loadAudioBuffer(this.audioContext, require("@/assets/audio/Water.mp3"));

        // ضبط المصدر
        this.source = this.audioContext.createBufferSource();
        this.applyFilter(this.selectedFilter);

        // إعداد Howler لتشغيل الصوت المعدل
        this.sound = new Howl({
          src: [require("@/assets/audio/Water.mp3")],
          volume: 1.0,
          html5: true,
        });

        // تحديث مصدر الفيديو
        const video = this.$refs.video;
        video.src = URL.createObjectURL(file);
        video.load();
        video.play();

        // ربط الصوت بالمكون الصوتي
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.filter);
        this.filter.connect(this.audioContext.destination);
        this.source.start();
      } else {
        alert("يرجى رفع ملف فيديو.");
      }
    },
    async loadAudioBuffer(audioContext, url) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return audioContext.decodeAudioData(arrayBuffer);
    },
    applyFilter(filterType) {
      if (this.filter) {
        this.filter.disconnect(); // فصل الفلتر الحالي
      }

      switch (filterType) {
        case 'lowpass':
          this.filter = this.audioContext.createBiquadFilter();
          this.filter.type = 'lowpass';
          this.filter.frequency.value = 1000;
          break;
        case 'highpass':
          this.filter = this.audioContext.createBiquadFilter();
          this.filter.type = 'highpass';
          this.filter.frequency.value = 1000;
          break;
        case 'bandpass':
          this.filter = this.audioContext.createBiquadFilter();
          this.filter.type = 'bandpass';
          this.filter.frequency.value = 1000;
          this.filter.Q.value = 1; // معدل جودة الفلتر
          break;
        case 'notch':
          this.filter = this.audioContext.createBiquadFilter();
          this.filter.type = 'notch';
          this.filter.frequency.value = 1000;
          this.filter.Q.value = 1; // معدل جودة الفلتر
          break;
        case 'peaking':
          this.filter = this.audioContext.createBiquadFilter();
          this.filter.type = 'peaking';
          this.filter.frequency.value = 1000;
          this.filter.gain.value = 10; // تعيين كسب الفلتر
          this.filter.Q.value = 1; // معدل جودة الفلتر
          break;
        case 'allpass':
          this.filter = this.audioContext.createBiquadFilter();
          this.filter.type = 'allpass';
          this.filter.frequency.value = 1000;
          break;
        default:
          this.filter = this.audioContext.createGain(); // إذا لم يكن هناك فلتر، استخدم مكبر الصوت كبديل
      }
      this.source.connect(this.filter);
      this.filter.connect(this.audioContext.destination);
    },
    playSound() {
      if (this.sound) {
        this.sound.play();
      } else {
        alert("الصوت غير محمل بعد.");
      }
    },
    async mergeAudioWithVideo() {
      if (!this.videoFile) {
        alert("يرجى رفع ملف فيديو أولاً.");
        return;
      }

      await this.loadFFmpeg();

      // تحميل ملفات الفيديو والصوت
      const videoData = await fetchFile(this.videoFile);
      const audioResponse = await fetch(require("@/assets/audio/Water.mp3"));
      const audioData = await audioResponse.arrayBuffer();

      // إضافة الملفات إلى FFmpeg
      this.ffmpeg.FS("writeFile", "input_video.mp4", videoData);
      this.ffmpeg.FS("writeFile", "input_audio.mp3", new Uint8Array(audioData));

      // تنفيذ عملية الدمج باستخدام FFmpeg
      await this.ffmpeg.run(
        "-i",
        "input_video.mp4",
        "-i",
        "input_audio.mp3",
        "-c:v",
        "copy",
        "-filter_complex",
        "[0:a:0][1:a:0]amerge=inputs=2[a]",
        "-map",
        "0:v:0",
        "-map",
        "[a]",
        "-ac",
        "2",
        "-shortest",
        "output.mp4"
      );

      // الحصول على الملف الناتج من ذاكرة FFmpeg
      const outputData = this.ffmpeg.FS("readFile", "output.mp4");

      // إنشاء رابط لتحميل الملف
      const outputBlob = new Blob([outputData.buffer], { type: "video/mp4" });
      this.outputUrl = URL.createObjectURL(outputBlob);

      // تحديث مصدر الفيديو الجديد
      const video = this.$refs.video;
      video.src = this.outputUrl;
      video.load();
      video.play();

      alert("تم دمج الصوت والفيديو بنجاح.");
    },
    downloadVideo() {
      if (this.outputUrl) {
        const a = document.createElement("a");
        a.href = this.outputUrl;
        a.download = "output.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("لا يوجد فيديو لتحميله.");
      }
    },
  },
};
</script>

<style>
/* يمكنك إضافة أي أنماط CSS هنا */
</style>
