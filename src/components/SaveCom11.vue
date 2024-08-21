<template>
  <div>
    <input type="file" accept="video/*" @change="handleFileUpload" />
    <video ref="videoPlayer" controls></video>
    <div>
      <label>
        <input type="checkbox" v-model="filters.bass" /> Bass Boost
      </label>
      <label>
        <input type="checkbox" v-model="filters.treble" /> Treble Boost
      </label>
      <label>
        <input type="checkbox" v-model="filters.echo" /> Echo
      </label>
      <label>
        <input type="checkbox" v-model="filters.highpass" /> Highpass Filter
      </label>
    </div>
    <button @click="saveVideo">Save Video</button>
  </div>
</template>

<script>
import { createFFmpeg } from '@ffmpeg/ffmpeg';

export default {
  data() {
    return {
      filters: {
        bass: false,
        treble: false,
        echo: false,
        highpass: false,
      },
      audioContext: null,
      source: null,
      gainNode: null,
      filtersNodes: [],
      videoBlob: null,
      ffmpeg: null,
    };
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        const videoPlayer = this.$refs.videoPlayer;
        videoPlayer.src = URL.createObjectURL(file);
        videoPlayer.load();
        videoPlayer.play();

        this.setupAudioContext();
        this.videoBlob = file; // Save the original video file blob
      }
    },
    setupAudioContext() {
      if (this.audioContext) {
        this.audioContext.close();
      }

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const videoElement = this.$refs.videoPlayer;
      this.source = this.audioContext.createMediaElementSource(videoElement);
      this.gainNode = this.audioContext.createGain();
      this.source.connect(this.gainNode);

      this.applyFilters();
    },
    applyFilters() {
      this.filtersNodes.forEach(node => node.disconnect());

      this.filtersNodes = [];

      if (this.filters.bass || this.filters.treble || this.filters.echo || this.filters.highpass) {
        if (this.filters.bass) {
          const bassFilter = this.audioContext.createBiquadFilter();
          bassFilter.type = 'lowshelf';
          bassFilter.frequency.setValueAtTime(100, this.audioContext.currentTime);
          bassFilter.gain.setValueAtTime(15, this.audioContext.currentTime);
          this.filtersNodes.push(bassFilter);
          this.gainNode.connect(bassFilter);
        }

        if (this.filters.treble) {
          const trebleFilter = this.audioContext.createBiquadFilter();
          trebleFilter.type = 'highshelf';
          trebleFilter.frequency.setValueAtTime(3000, this.audioContext.currentTime);
          trebleFilter.gain.setValueAtTime(15, this.audioContext.currentTime);
          this.filtersNodes.push(trebleFilter);
          this.gainNode.connect(trebleFilter);
        }

        if (this.filters.echo) {
          const delayNode = this.audioContext.createDelay();
          delayNode.delayTime.setValueAtTime(0.5, this.audioContext.currentTime);
          this.filtersNodes.push(delayNode);
          this.gainNode.connect(delayNode);
        }

        if (this.filters.highpass) {
          const highpassFilter = this.audioContext.createBiquadFilter();
          highpassFilter.type = 'highpass';
          highpassFilter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
          this.filtersNodes.push(highpassFilter);
          this.gainNode.connect(highpassFilter);
        }

        if (this.filtersNodes.length > 0) {
          this.filtersNodes[this.filtersNodes.length - 1].connect(this.audioContext.destination);
        } else {
          this.gainNode.connect(this.audioContext.destination);
        }
      } else {
        this.gainNode.connect(this.audioContext.destination);
      }
    },
    async saveVideo() {
      if (!this.videoBlob) {
        alert('Please upload a video first.');
        return;
      }

      if (!this.ffmpeg) {
        this.ffmpeg = createFFmpeg({ log: true });
        await this.ffmpeg.load();
      }

      const videoFileURL = URL.createObjectURL(this.videoBlob);
      const response = await fetch(videoFileURL);
      
      // Check if the response is ok and has a non-zero length
      if (!response.ok) {
        console.error('Failed to fetch video data');
        return;
      }
      
      const videoData = await response.arrayBuffer();

      // Log to ensure videoData is not empty
      console.log('Video data length:', videoData.byteLength);

      this.ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoData));

      let filterOptions = '';
      if (this.filters.bass) filterOptions += ' -af "bass=g=15"';
      if (this.filters.treble) filterOptions += ' -af "treble=g=15"';
      if (this.filters.echo) filterOptions += ' -af "aecho=0.8:0.9:1000:0.3"';
      if (this.filters.highpass) filterOptions += ' -af "highpass=f=1000"';

      await this.ffmpeg.run('-i', 'input.mp4', ...filterOptions.split(' '), 'output.mp4');

      const data = this.ffmpeg.FS('readFile', 'output.mp4');

      const filteredVideoBlob = new Blob([data.buffer], { type: 'video/mp4' });
      const filteredVideoURL = URL.createObjectURL(filteredVideoBlob);

      const a = document.createElement('a');
      a.href = filteredVideoURL;
      a.download = 'filtered-video.mp4';
      a.click();

      URL.revokeObjectURL(filteredVideoURL);
      URL.revokeObjectURL(videoFileURL); // Clean up the URL created for the original video
    }
  },
  watch: {
    filters: {
      handler() {
        this.applyFilters();
      },
      deep: true
    }
  }
};
</script>

<style scoped>
/* إضافة أي تنسيق مخصص هنا */
</style>
