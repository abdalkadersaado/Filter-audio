<template>
  <div id="app">
    <h1>Video Audio Filters</h1>
    <input
      type="file"
      @change="handleFileUpload"
      accept="video/*"
      class="file-upload"
    />
    <div class="video-container">
      <video
        ref="video"
        controls
        @play="setupAudioContext"
        class="video-player"
      ></video>
    </div>
    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

    <div v-if="fileLoaded" class="controls">
      <div class="filter-buttons">
        <button @click="applyFilter('highPitch')">High Pitch</button>
        <button @click="applyFilter('lowPitch')">Low Pitch</button>
        <button @click="applyFilter('echo')">Echo</button>
        <!-- Add more filter buttons here -->
      </div>

      <div class="actions">
        <button @click="resetFilters">Reset Filters</button>
        <button @click="saveVideo">Save Video</button>
      </div>

      <div v-if="saveInProgress" class="progress">
        <p>Progress: {{ (progress * 100).toFixed(2) }}%</p>
        <div v-if="remainingTime !== null">
          Time Remaining: {{ remainingTime }} seconds
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Push from "push.js";
export default {
  data() {
    return {
      audioContext: null,
      source: null,
      filter: null,
      errorMessage: "",
      fileLoaded: false,
      playbackRate: 1,
      uploadedFile: null,
      selectedFilter: null,
      progress: 0,
      remainingTime: null,
      saveInterval: null,
      saveInProgress: false,
      worker: null,
      scaleWidth: 200,
      scaleHeight: 150,
    };
  },
  methods: {
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file || !file.type.startsWith("video/")) {
        this.errorMessage = "Please upload a valid video file.";
        return;
      }
      this.uploadedFile = file;
      this.errorMessage = "";
      const url = URL.createObjectURL(file);
      this.$refs.video.src = url;
      this.fileLoaded = true;
      this.resetWorker();
    },
    setupAudioContext() {
      if (this.audioContext) return;

      try {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const videoElement = this.$refs.video;
        this.source = this.audioContext.createMediaElementSource(videoElement);
        this.connectNodes();
      } catch (error) {
        this.errorMessage = "Failed to setup audio context. Please try again.";
        console.error(error);
      }
    },
    applyFilter(type) {
      if (!this.audioContext) {
        this.errorMessage =
          "AudioContext is not initialized. Please wait for the video to start playing.";
        return;
      }

      this.resetFilters();
      this.selectedFilter = type;

      switch (type) {
        case "highPitch":
          this.filter = this.createHighPitchFilter();
          break;
        case "lowPitch":
          this.filter = this.createLowPitchFilter();
          break;
        case "echo":
          this.filter = this.createEchoFilter();
          break;
        // Add more cases here for additional filters
      }
      this.connectNodes();
    },
    connectNodes() {
      if (this.source) {
        this.source.connect(this.filter || this.audioContext.destination);
        if (this.filter) {
          this.filter.connect(this.audioContext.destination);
        }
      }
    },
    resetFilters() {
      if (this.filter) {
        this.filter.disconnect();
        this.filter = null;
      }
    },
    createHighPitchFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highshelf";
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      filter.gain.setValueAtTime(25, this.audioContext.currentTime);
      return filter;
    },
    createLowPitchFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowshelf";
      filter.frequency.setValueAtTime(300, this.audioContext.currentTime);
      filter.gain.setValueAtTime(-25, this.audioContext.currentTime);
      return filter;
    },
    createEchoFilter() {
      if (!this.audioContext) return;
      const delay = this.audioContext.createDelay();
      delay.delayTime.setValueAtTime(0.5, this.audioContext.currentTime); // 500 ms delay
      const feedback = this.audioContext.createGain();
      feedback.gain.setValueAtTime(0.5, this.audioContext.currentTime); // feedback amount
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime); // cutoff frequency
      this.source.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(filter);
      filter.connect(this.audioContext.destination);
      return filter;
    },
    resetWorker() {
      const availableMemory = navigator.deviceMemory;
      console.log(`Available memory: ${availableMemory} GB`);
      if (this.worker) {
        this.worker.terminate();
      }
      this.worker = new Worker(new URL("@/worker10.js", import.meta.url), {
        type: "module",
      });
      this.worker.onmessage = (event) => {
        const { url, progress, remainingTime, error } = event.data;

        if (error) {
          this.errorMessage = error;
          this.saveInProgress = false;
        } else if (url) {
          const downloadLink = document.createElement("a");
          downloadLink.href = url;
          downloadLink.download = "output.mp4";
          downloadLink.click();

          URL.revokeObjectURL(url);
          this.saveInProgress = false;
          this.showNotification(
            "Video saved successfully!",
            "Your video has been processed and saved."
          );
        } else {
          this.progress = progress;
          this.remainingTime = remainingTime;
        }
      };
    },
    showNotification() {
      if (!("Notification" in window)) {
        console.error("This browser does not support notifications.");
        return;
      }

      if (Notification.permission === "granted") {
        Push.create("تمت معالجة الفيديو", {
          body: "الفيديو أصبح جاهزاً للعرض.",
          icon: require("@/assets/logo.png"),
          timeout: 20000,
          vibrate: [200, 100, 200],
          onClick: function () {
            window.open("https://localhost:9000/save3", "_blank");
          },
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then(function (permission) {
          if (permission === "granted") {
            Push.create("تمت معالجة الفيديو", {
              body: "الفيديو أصبح جاهزاً للعرض.",
              icon: require("@/assets/logo.png"),
              timeout: 20000,
              vibrate: [200, 100, 200],
              onClick: function () {
                window.open("https://localhost:9000/save3", "_blank");
              },
            });
          }
        });
      }
    },
    saveVideo() {
      if (!this.uploadedFile || this.saveInProgress) return;

      if (!navigator.onLine) {
        this.errorMessage =
          "No internet connection. Please check your connection and try again.";
        return;
      }
      this.saveInProgress = true;

      const startTime = Date.now();
      this.worker.postMessage({
        uploadedFile: this.uploadedFile,
        selectedFilter: this.selectedFilter,
        playbackRate: this.playbackRate,
        startTime,
        scaleWidth: this.scaleWidth,
        scaleHeight: this.scaleHeight,
      });
    },
  },
};
</script>

<style>
/* Add your CSS styles here */
</style>
