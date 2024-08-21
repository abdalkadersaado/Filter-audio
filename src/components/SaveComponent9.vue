<template>
  <div id="app">
    <h1>Video Audio Filters</h1>
    <button @click="startCameraRecording" class="camera-button">
      Record Video
    </button>

    <div class="video-preview">
      <video ref="cameraVideo" autoplay></video>
    </div>

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
        <button @click="applyFilter('BoldSound')">Bold Sound</button>
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
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
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
      saveInProgress: false,
      scaleWidth: 200,
      scaleHeight: 150,
      recording: false,
      mediaRecorder: null,
      recordedChunks: [],
      cameraStream: null,
      ffmpeg: null,
      videoElement: null,
    };
  },
  async mounted() {
    this.ffmpeg = createFFmpeg({ log: true });
    await this.ffmpeg.load();
    this.videoElement = this.$refs.video;
  },
  methods: {
    async handleFileUpload(event) {
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
      this.resetFilters(); // Clear any previous filters
    },
    async startCameraRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        this.$refs.cameraVideo.srcObject = stream;
        this.cameraStream = stream;
        this.recording = true;

        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm",
        });
        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          this.$refs.video.src = url;
          this.uploadedFile = blob;
          this.fileLoaded = true;
          this.recording = false;
          this.stopCamera(); // Call the method to stop the camera
        };

        // Stop recording after 15 seconds
        setTimeout(() => {
          if (this.recording) {
            this.mediaRecorder.stop();
          }
        }, 15000);

        this.mediaRecorder.start();
      } catch (error) {
        this.errorMessage = `Failed to access the camera. Error: ${error.message}`;
        console.error(error);
      }
    },
    stopCamera() {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((track) => track.stop());
        this.cameraStream = null;
      }
    },
    resetFilters() {
      if (this.filter) {
        this.filter.disconnect();
        this.filter = null;
      }

      const videoElement = this.$refs.video;
      videoElement.playbackRate = this.playbackRate;
    },
    applyFilter(type) {
      if (!this.audioContext) {
        this.errorMessage =
          "AudioContext is not initialized. Please wait for the video to start playing.";
        return;
      }

      this.resetFilters();

      switch (type) {
        case "highPitch":
          this.filter = this.createHighPitchFilter();
          break;

        case "BoldSound":
          this.filter = this.createBoldSoundFilter();
          break;
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
    createHighPitchFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highshelf";
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      filter.gain.setValueAtTime(5, this.audioContext.currentTime);
      return filter;
    },
    createBoldSoundFilter() {
      if (!this.audioContext) return;

      const scriptNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      scriptNode.onaudioprocess = (audioProcessingEvent) => {
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const outputBuffer = audioProcessingEvent.outputBuffer;

        for (
          let channel = 0;
          channel < outputBuffer.numberOfChannels;
          channel++
        ) {
          const inputData = inputBuffer.getChannelData(channel);
          const outputData = outputBuffer.getChannelData(channel);

          for (let sample = 0; sample < inputBuffer.length; sample++) {
            const index = Math.floor(sample * (2 / 3));
            outputData[sample] = inputData[index] || 0;
          }
        }
      };

      this.source.disconnect();
      this.source.connect(scriptNode);
      scriptNode.connect(this.audioContext.destination);

      this.filter = scriptNode;
      return scriptNode;
    },
    async saveVideo() {
      if (!this.uploadedFile || this.saveInProgress) return;

      if (!navigator.onLine) {
        this.errorMessage =
          "No internet connection. Please check your connection and try again.";
        return;
      }
      this.saveInProgress = true;

      try {
        const file = await fetchFile(this.uploadedFile);
        this.ffmpeg.FS("writeFile", "input.webm", file);

        let filterCommand = "";
        switch (this.selectedFilter) {
          case "highPitch":
            filterCommand = "highshelf=f=1000:g=25";
            break;
          case "BoldSound":
            filterCommand = "atempo=1.0,asetrate=44100*2/3";
            break;
        }

        // const videoFilter = `setpts=${1 / this.playbackRate}*PTS${
        //   this.scaleWidth && this.scaleHeight
        //     ? `,scale=${this.scaleWidth}:${this.scaleHeight}`
        //     : ""
        // }`;
        const audioFilter = `atempo=${this.playbackRate}`;

        this.ffmpeg.setProgress(({ ratio }) => {
          this.progress = ratio;
          const elapsedTime = (Date.now() - this.startTime) / 1000;
          const totalEstimatedTime = elapsedTime / ratio;
          this.remainingTime = totalEstimatedTime - elapsedTime;
        });

        await this.ffmpeg.run(
          "-i",
          "input.webm",
          //   '-vf', videoFilter,
          "-af",
          filterCommand ? `${filterCommand},${audioFilter}` : audioFilter,
          "output.mp4"
        );

        const data = this.ffmpeg.FS("readFile", "output.mp4");
        const videoBlob = new Blob([data.buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(videoBlob);

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
      } catch (error) {
        this.errorMessage = `Error processing video: ${error.message}`;
        this.saveInProgress = false;
      }
    },
    showNotification(title, body) {
      if (!("Notification" in window)) {
        console.error("This browser does not support notifications.");
        return;
      }

      if (Notification.permission === "granted") {
        Push.create(title, {
          body,
          icon: require("@/assets/logo.png"),
          timeout: 20000,
          vibrate: [200, 100, 200],
          onClick: function () {
            window.open("https://localhost:9000/save3", "_blank");
          },
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            Push.create(title, {
              body,
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
  },
};
</script>

<style scoped>
#app {
  text-align: center;
  margin: 50px auto;
  max-width: 900px;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  background-color: #f9f9f9;
}

h1 {
  color: #333;
}

.file-upload {
  margin-top: 20px;
}
.video-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  overflow: hidden;
}

.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.error {
  color: red;
  margin-top: 10px;
  font-weight: bold;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 20px;
}

button {
  margin: 8px 12px;
  padding: 10px 20px;
  background-color: #c93ebd;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #a0459b;
}

button:focus {
  outline: none;
}

.playback-controls {
  margin-bottom: 20px;
}

.playback-rate-slider {
  width: 50%;
  margin-top: 10px;
}

.actions {
  margin-top: 20px;
}

.progress {
  margin-top: 20px;
  font-weight: bold;
}
</style>
