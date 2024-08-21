<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <div v-if="videoSrc">
      <video ref="video" id="video-player" class="video-js vjs-default-skin" controls></video>
      <div v-if="player">
        <div class="controls">
          <label>Start Time:</label>
          <input type="range" v-model.number="startTime" :min="0" :max="videoDuration" step="0.1" @input="updateMarker('start')" />
          <span>{{ startTime.toFixed(1) }} seconds</span>
          <label>End Time:</label>
          <input type="range" v-model.number="endTime" :min="0" :max="videoDuration" step="0.1" @input="updateMarker('end')" />
          <span>{{ endTime.toFixed(1) }} seconds</span>
          <button @click="cutVideo">Cut Video</button>
          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-markers'; // Import videojs-markers

export default {
  data() {
    return {
      videoSrc: "",
      startTime: 0,
      endTime: 30,
      videoDuration: 30,
      ffmpeg: null,
      player: null,
      errorMessage: ""
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
        this.$nextTick(() => {
          this.initVideoJs();
        });
      }
    },
    initVideoJs() {
      if (!this.$refs.video) {
        console.error('Video element not found');
        return;
      }

      this.player = videojs(this.$refs.video, {
        controls: true,
        autoplay: false,
        preload: 'auto',
      });

      this.player.src({ type: 'video/mp4', src: this.videoSrc });

      this.player.on('loadedmetadata', () => {
        this.videoDuration = this.player.duration();
        this.endTime = Math.min(this.videoDuration, this.endTime);
        this.updateMarkers();
      });

      this.player.on('timeupdate', () => {
        if (this.startTime >= this.endTime || this.endTime - this.startTime > 30) {
          this.errorMessage = 'The duration must be within 30 seconds and start time must be before end time.';
          return;
        }
        this.errorMessage = '';
      });
    },
    updateMarkers() {
      // Clear existing markers
      this.player.markers.removeAll();

      // Add new markers
      this.player.markers({
        markers: [
          {
            time: this.startTime,
            label: 'Start',
            className: 'vjs-marker-start'
          },
          {
            time: this.endTime,
            label: 'End',
            className: 'vjs-marker-end'
          }
        ],
        markerStyle: {
          'background-color': 'red',
          'border-radius': '50%',
          'width': '8px',
          'height': '8px'
        },
      });
    },
    updateMarker(type) {
      if (type === 'start') {
        this.updateMarkers();
      } else if (type === 'end') {
        this.updateMarkers();
      }

      // Ensure the end time is not before the start time and within the video duration
      if (this.endTime <= this.startTime) {
        this.endTime = this.startTime + 1;
      }
      if (this.endTime > this.videoDuration) {
        this.endTime = this.videoDuration;
      }

      this.player.currentTime(this.startTime); // Sync current time to start time
    },
    async cutVideo() {
      if (!this.videoSrc || this.endTime <= this.startTime || this.endTime - this.startTime > 30) {
        this.errorMessage = 'The duration must be within 30 seconds and start time must be before end time.';
        return;
      }

      const videoFile = await fetchFile(this.videoSrc);

      this.ffmpeg.FS("writeFile", "input.mp4", new Uint8Array(videoFile));

      const duration = this.endTime - this.startTime;

      await this.ffmpeg.run(
        "-ss",
        `${this.startTime}`,
        "-i",
        "input.mp4",
        "-t",
        `${duration}`,
        "-c",
        "copy",
        "output.mp4"
      );

      const data = this.ffmpeg.FS("readFile", "output.mp4");
      const videoBlob = new Blob([data.buffer], { type: "video/mp4" });
      const videoUrl = URL.createObjectURL(videoBlob);

      const cutVideo = document.createElement("video");
      cutVideo.src = videoUrl;
      cutVideo.controls = true;
      document.body.appendChild(cutVideo);
    },
  },
};
</script>

<style>
.vjs-marker-start {
  background-color: green;
}

.vjs-marker-end {
  background-color: red;
}

.error {
  color: red;
  font-weight: bold;
}

.controls {
  margin-top: 10px;
}
</style>
