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
        <label> <input type="checkbox" v-model="filters.echo" /> Echo </label>
        <label>
          <input type="checkbox" v-model="filters.highpass" /> Highpass Filter
        </label>
        <label>
          <input type="checkbox" v-model="filters.equalizer" /> Equalizer
        </label>
      </div>
      <button @click="saveVideo">Save Video</button>
      <div v-if="saveInProgress" class="progress">
          <p>Progress: {{ (progress * 100).toFixed(2) }}%</p>
          <div v-if="remainingTime !== null">
            Time Remaining: {{ remainingTime }} seconds
          </div>
        </div>
    </div>
  </template>
  
  <script>
  import { createFFmpeg } from "@ffmpeg/ffmpeg";
  
  export default {
    data() {
      return {
        filters: {
          bass: false,
          treble: false,
          echo: false,
          highpass: false,
          equalizer: false,
        },
        audioContext: null,
        source: null,
        gainNode: null,
        filtersNodes: [],
        videoBlob: null,
        ffmpeg: null,
        progress: 0,
        remainingTime: null,
        saveInterval: null,
        saveInProgress: false,
        
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
  
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const videoElement = this.$refs.videoPlayer;
        this.source = this.audioContext.createMediaElementSource(videoElement);
        this.gainNode = this.audioContext.createGain();
        this.source.connect(this.gainNode);
  
        this.applyFilters();
      },
      applyFilters() {
        this.filtersNodes.forEach((node) => node.disconnect());
  
        this.filtersNodes = [];
  
        if (
          this.filters.bass ||
          this.filters.treble ||
          this.filters.echo ||
          this.filters.highpass||
          this.filters.equalizer
        ) {
          if (this.filters.bass) {
            const bassFilter = this.audioContext.createBiquadFilter();
            bassFilter.type = "lowshelf";
            bassFilter.frequency.setValueAtTime(
              100,
              this.audioContext.currentTime
            );
            bassFilter.gain.setValueAtTime(15, this.audioContext.currentTime);
            this.filtersNodes.push(bassFilter);
            this.gainNode.connect(bassFilter);
          }
  
          if (this.filters.treble) {
            const trebleFilter = this.audioContext.createBiquadFilter();
            trebleFilter.type = "highshelf";
            trebleFilter.frequency.setValueAtTime(
              3000,
              this.audioContext.currentTime
            );
            trebleFilter.gain.setValueAtTime(15, this.audioContext.currentTime);
            this.filtersNodes.push(trebleFilter);
            this.gainNode.connect(trebleFilter);
          }
  
          if (this.filters.echo) {
            const delayNode = this.audioContext.createDelay();
            delayNode.delayTime.setValueAtTime(
              0.5,
              this.audioContext.currentTime
            );
            this.filtersNodes.push(delayNode);
            this.gainNode.connect(delayNode);
          }
  
          if (this.filters.highpass) {
            const highpassFilter = this.audioContext.createBiquadFilter();
            highpassFilter.type = "highpass";
            highpassFilter.frequency.setValueAtTime(
              1000,
              this.audioContext.currentTime
            );
            this.filtersNodes.push(highpassFilter);
            this.gainNode.connect(highpassFilter);
          }
  
          if (this.filters.equalizer) {
            // يمكن إضافة فلاتر إضافية للترددات حسب النغمات المرغوبة
            const equalizerFilter = this.audioContext.createBiquadFilter();
            equalizerFilter.type = "peaking";
            equalizerFilter.frequency.setValueAtTime(
              1000,
              this.audioContext.currentTime
            );
            equalizerFilter.gain.setValueAtTime(10, this.audioContext.currentTime);
            this.filtersNodes.push(equalizerFilter);
            this.gainNode.connect(equalizerFilter);
          }
          if (this.filtersNodes.length > 0) {
            this.filtersNodes[this.filtersNodes.length - 1].connect(
              this.audioContext.destination
            );
          } else {
            this.gainNode.connect(this.audioContext.destination);
          }
        } else {
          this.gainNode.connect(this.audioContext.destination);
        }
      },
      async saveVideo2() {
        if (!this.videoBlob) {
          alert("Please upload a video first.");
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
          console.error("Failed to fetch video data");
          return;
        }
  
        const videoData = await response.arrayBuffer();
  
        // Log to ensure videoData is not empty
        console.log("Video data length:", videoData.byteLength);
  
        this.ffmpeg.FS("writeFile", "input.mp4", new Uint8Array(videoData));
  
        let filterOptions = "";
        if (this.filters.bass) filterOptions += ' -af "bass=g=15"';
        if (this.filters.treble) filterOptions += ' -af "treble=g=15"';
        if (this.filters.echo) filterOptions += ' -af "aecho=0.8:0.9:1000:0.3"';
        if (this.filters.highpass) filterOptions += ' -af "highpass=f=1000"';
  
        await this.ffmpeg.run(
          "-i",
          "input.mp4",
          ...filterOptions.split(" "),
          "output.mp4"
        );
  
        const data = this.ffmpeg.FS("readFile", "output.mp4");
  
        const filteredVideoBlob = new Blob([data.buffer], { type: "video/mp4" });
        const filteredVideoURL = URL.createObjectURL(filteredVideoBlob);
  
        const a = document.createElement("a");
        a.href = filteredVideoURL;
        a.download = "filtered-video.mp4";
        a.click();
  
        URL.revokeObjectURL(filteredVideoURL);
        URL.revokeObjectURL(videoFileURL); // Clean up the URL created for the original video
      },
      async saveVideo1() {
        if (!this.videoBlob) {
          alert("Please upload a video first.");
          return;
        }
  
        if (!this.ffmpeg) {
          this.ffmpeg = createFFmpeg({ log: true });
          await this.ffmpeg.load();
        }
  
        const videoFileURL = URL.createObjectURL(this.videoBlob);
        const response = await fetch(videoFileURL);
  
        if (!response.ok) {
          console.error("Failed to fetch video data");
          return;
        }
  
        const videoData = await response.arrayBuffer();
        this.ffmpeg.FS("writeFile", "input.mp4", new Uint8Array(videoData));
  
        // Construct the filter options string
        let filterOptions = [];
        if (this.filters.bass) filterOptions.push("bass=g=15");
        if (this.filters.treble) filterOptions.push("treble=g=15");
        if (this.filters.echo) filterOptions.push("aecho=0.8:0.9:1000:0.3");
        if (this.filters.highpass) filterOptions.push("highpass=f=1000");
  
        // Join the filter options with commas and construct the filter string
        const filterString =
          filterOptions.length > 0 ? `-af ${filterOptions.join(",")}` : "";
  
        try {
          // Log the FFmpeg command for debugging
          console.log("Running FFmpeg command with filters:", filterString);
  
          // Run FFmpeg with the filter string
          await this.ffmpeg.run(
            "-i",
            "input.mp4",
            "-preset",
            "fast",
            "-b:v",
            "1M",
            ...filterString.split(" "),
            "output.mp4"
          );
  
          // Check if output.mp4 file exists
          const outputFiles = this.ffmpeg.FS("readdir", "/");
          if (!outputFiles.includes("output.mp4")) {
            console.error("Output file not found");
            return;
          }
  
          const data = this.ffmpeg.FS("readFile", "output.mp4");
          const filteredVideoBlob = new Blob([data.buffer], {
            type: "video/mp4",
          });
          const filteredVideoURL = URL.createObjectURL(filteredVideoBlob);
  
          const a = document.createElement("a");
          a.href = filteredVideoURL;
          a.download = "filtered-video.mp4";
          a.click();
  
          URL.revokeObjectURL(filteredVideoURL);
          URL.revokeObjectURL(videoFileURL); // Clean up the URL created for the original video
        } catch (error) {
          console.error("Error processing video:", error);
        }
      },
      async saveVideo() {
        if (!this.videoBlob) {
          alert("Please upload a video first.");
          return;
        }
  
        if (!this.ffmpeg) {
          this.ffmpeg = createFFmpeg({
            log: true,
            progress: (p) => {
            this.progress = p.ratio;
  
            if (p.ratio === 0) {
              this.remainingTime = null;
              this.startTime = Date.now();
            } else if (p.ratio === 1) {
              this.remainingTime = "0.00";
            } else {
              const elapsedTime = (Date.now() - this.startTime) / 1000;
              const totalEstimatedTime = elapsedTime / p.ratio;
              const remainingTime = totalEstimatedTime - elapsedTime;
              this.remainingTime = remainingTime.toFixed(2);
            }
          },
          });
          await this.ffmpeg.load();
        }
  
        this.saveInProgress = true;
  
        const videoData = await this.videoBlob.arrayBuffer();
        console.log("Original Video Data Size:", videoData.byteLength);
        this.ffmpeg.FS("writeFile", "input.mp4", new Uint8Array(videoData));
  
        let filterOptions = [];
        if (this.filters.bass) filterOptions.push("bass=g=15");
        if (this.filters.treble) filterOptions.push("treble=g=15");
        if (this.filters.echo) filterOptions.push("aecho=0.8:0.9:1000:0.3");
        if (this.filters.highpass) filterOptions.push("highpass=f=1000");
        if (this.filters.equalizer) filterOptions.push("equalizer=f=1000:width_type=o:width=2:g=10");
        const filterString =
          filterOptions.length > 0 ? `-af ${filterOptions.join(",")}` : "";
        console.log("Filter String:", filterString);
  
        try {
  
          await this.ffmpeg.run(
            "-i",
            "input.mp4",
            "-preset",
            "superfast",
            "-b:v",
            "1M",
            ...filterString.split(" "),
            "output.mp4"
          );
  
  
          const data = this.ffmpeg.FS("readFile", "output.mp4");
          console.log("Output File Size:", data.byteLength);
          if (data.byteLength === 0) {
            console.error("Output file is empty");
            return;
          }
  
          const filteredVideoBlob = new Blob([data.buffer], {
            type: "video/mp4",
          });
  
          const filteredVideoURL = URL.createObjectURL(filteredVideoBlob);
          const a = document.createElement("a");
          a.href = filteredVideoURL;
          a.download = "filtered-video.mp4";
          a.click();
  
          URL.revokeObjectURL(filteredVideoURL);
          this.saveInProgress = false;
        } catch (error) {
          console.error("Error processing video:", error);
        }
      },
    },
    watch: {
      filters: {
        handler() {
          this.applyFilters();
        },
        deep: true,
      },
    },
  };
  </script>
  
  <style scoped>
  /* إضافة أي تنسيق مخصص هنا */
  </style>
  