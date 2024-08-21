<!-- src/components/VideoRecorder.vue -->
<template>
  <div>
    <video ref="video" autoplay></video>
    <button @click="startRecording">Start Recording</button>
    <button @click="stopRecording" :disabled="!isRecording">
      Stop Recording
    </button>
    <button @click="saveVideo" :disabled="!videoBlob">Save Video</button>
    <video ref="playback" controls v-if="videoUrl"></video>
  </div>
</template>

<script>
import RecordRTC from "recordrtc";

export default {
  data() {
    return {
      isRecording: false,
      recorder: null,
      videoBlob: null,
      videoUrl: null,
      audioContext: null,
      streamWithFilters: null,
    };
  },
  methods: {
    async startRecording() {
      this.isRecording = true;

      // Initialize Web Audio API
      this.audioContext = new AudioContext();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      const source = this.audioContext.createMediaStreamSource(mediaStream);

      // Apply filters
      const highPassFilter = this.audioContext.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 1000;
      source.connect(highPassFilter);

      const destination = this.audioContext.createMediaStreamDestination();
      highPassFilter.connect(destination);
      this.streamWithFilters = destination.stream;

      // Start recording with filtered stream
      this.recorder = new RecordRTC(this.streamWithFilters, { type: "video" });
      this.recorder.startRecording();
    },
    stopRecording() {
      this.isRecording = false;
      this.recorder.stopRecording(() => {
        this.videoBlob = this.recorder.getBlob();
        this.videoUrl = URL.createObjectURL(this.videoBlob);
        this.$refs.playback.src = this.videoUrl;
      });
    },
    saveVideo() {
      const link = document.createElement("a");
      link.href = this.videoUrl;
      link.download = "recorded-video.mp4";
      link.click();
    },
  },
};
</script>

<style scoped>
/* Add any styles you need */
</style>
