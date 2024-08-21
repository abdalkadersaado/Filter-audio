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
        <button @click="applyFilter('BoldSound')">Bold Sound</button>
        <button @click="applyFilter('ThinSound')">Thin Sound</button>
        <button @click="applyFilter('female')">Female Voice</button>
        <button @click="applyFilter('underwater')">Underwater Effect</button>
        <button @click="applyFilter('echo')">Echo Effect</button>
        <button @click="applyFilter('robot')">Robot Effect</button>
        <button @click="applyFilter('reverb')">Reverb</button>
        <button @click="applyFilter('delay')">Delay</button>
        <button @click="applyFilter('equalizer')">Equalizer</button>
        <button @click="applyFilter('chorus')">Chorus</button>
        <button @click="applyFilter('pitchShift')">Pitch Shift</button>
        <button @click="applyFilter('bassBoost')">Bass Boost</button>
        <button @click="applyFilter('trebleBoost')">Treble Boost</button>
        <button @click="applyFilter('pop')">Pop</button>
        <button @click="applyFilter('stereo')">Stereo</button>
        <button @click="applyFilter('childVoice')">Child Voice</button>
      </div>

      <div class="playback-controls">
        <button @click="speedUpAudio">Speed Up</button>
        <input
          type="range"
          min="0.5"
          max="3.0"
          step="0.1"
          v-model="playbackRate"
          @input="updatePlaybackRate"
          class="playback-rate-slider"
        />
        <div>Playback Speed: {{ playbackRate }}x</div>
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

export default {
  data() {
    return {
      audioContext: null,
      source: null,
      filter: null,
      convolverBuffer: null,
      delayNode: null,
      pitchShifterNode: null,
      errorMessage: "",
      fileLoaded: false,
      playbackRate: 1,
      ffmpeg: null,
      uploadedFile: null,
      selectedFilter: null,
      progress: 0,
      remainingTime: null,
      saveInterval: null,
      saveInProgress: false,
    };
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
    },
    async setupAudioContext() {
      if (this.audioContext) return;

      try {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const videoElement = this.$refs.video;
        this.source = this.audioContext.createMediaElementSource(videoElement);

        // this.pitchShifterNode = this.createPitchShiftEffectFilter();
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
      //   save selected filter
      this.selectedFilter = type;

      switch (type) {
        case "highPitch":
          this.filter = this.createHighPitchFilter();
          break;
        case "BoldSound":
          this.filter = this.createBoldSoundFilter();
          break;
        case "ThinSound":
          this.filter = this.createThinSoundFilter();
          break;
        case "female":
          this.filter = this.createFemaleVoiceFilter();
          break;
        case "underwater":
          this.filter = this.createUnderwaterEffectFilter();
          break;
        case "echo":
          this.createEchoEffectFilter();
          break;
        case "robot":
          this.filter = this.createRobotEffectFilter();
          break;
        case "reverb":
          this.filter = this.createReverbEffectFilter();
          break;
        case "delay":
          this.createDelayEffectFilter();
          return;
        case "equalizer":
          this.createEqualizerEffectFilter();
          return;
        case "chorus":
          this.filter = this.createChorusEffectFilter();
          break;
        case "pitchShift":
          this.filter = this.createPitchShiftEffectFilter();
          break;
        case "bassBoost":
          this.filter = this.createBassBoostFilter();
          break;
        case "trebleBoost":
          this.filter = this.createTrebleBoostFilter();
          break;
        case "pop":
          this.filter = this.createPopFilter();
          break;
        case "stereo":
          this.createStereoEffectFilter();
          return;
        case "childVoice":
          this.applyChildVoiceFilter();
          return;
      }
      this.connectNodes();
    },
    connectNodes() {
      if (this.source) {
        this.source.connect(this.filter || this.audioContext.destination);
        if (this.filter) {
          this.filter.connect(this.audioContext.destination);
        }
        // here add delay
        if (this.delayNode) {
          this.source.connect(this.delayNode);
        }
        // here add pitch shift
        if (this.pitchShifterNode) {
          this.source.connect(this.pitchShifterNode);
          this.pitchShifterNode.connect(this.audioContext.destination);
        }
      }
    },
    resetFilters() {
      if (this.filter) {
        this.filter.disconnect();
        this.filter = null;
      }
      //   here disconnect delay filter
      if (this.delayNode) {
        this.delayNode.disconnect();
        this.delayNode = null;
      }
      //   here disconnect pitch Shifter filter
      if (this.pitchShifterNode) {
        this.pitchShifterNode.disconnect();
        this.pitchShifterNode = null;
      }
      // for speed up audio
      const videoElement = this.$refs.video;
      this.playbackRate = 1;
      videoElement.playbackRate = this.playbackRate;
    },
    speedUpAudio() {
      const videoElement = this.$refs.video;
      this.playbackRate = 2.0;
      videoElement.playbackRate = this.playbackRate;
    },
    updatePlaybackRate() {
      const videoElement = this.$refs.video;
      videoElement.playbackRate = this.playbackRate;
    },
    createHighPitchFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highshelf";
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      filter.gain.setValueAtTime(25, this.audioContext.currentTime);
      return filter;
    },
    createThinSoundFilter() {
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
            const index = Math.floor(sample * 1.5);
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
            // const index = Math.floor(sample * 1.5);
            // outputData[sample] = inputData[index] || 0;
          }
        }
      };

      // Connect the nodes
      this.source.disconnect(); // Ensure the source is not connected to any other node
      this.source.connect(scriptNode);
      scriptNode.connect(this.audioContext.destination);

      this.filter = scriptNode;
      return scriptNode;
    },
    createFemaleVoiceFilter() {
      if (!this.audioContext) return;

      const highPassFilter = this.audioContext.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.setValueAtTime(
        200,
        this.audioContext.currentTime
      );

      const lowPassFilter = this.audioContext.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.setValueAtTime(
        3000,
        this.audioContext.currentTime
      );

      const f = highPassFilter.connect(lowPassFilter);

      return f;
    },
    createUnderwaterEffectFilter() {
      if (!this.audioContext) return;

      const lowPassFilter = this.audioContext.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.setValueAtTime(
        800,
        this.audioContext.currentTime
      );

      const highPassFilter = this.audioContext.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.setValueAtTime(
        100,
        this.audioContext.currentTime
      );

      const delayNode = this.audioContext.createDelay();
      delayNode.delayTime.setValueAtTime(0.3, this.audioContext.currentTime);

      highPassFilter.connect(lowPassFilter);
      lowPassFilter.connect(delayNode);
      delayNode.connect(this.audioContext.destination);

      return highPassFilter;
    },
    createEchoEffectFilter() {
      if (!this.audioContext) return;

      this.delayNode = this.audioContext.createDelay();
      this.delayNode.delayTime.setValueAtTime(
        1.0,
        this.audioContext.currentTime
      );

      this.filter = this.audioContext.createGain();
      this.filter.gain.setValueAtTime(0.3, this.audioContext.currentTime);

      this.delayNode.connect(this.filter);
      this.filter.connect(this.delayNode);

      this.filter.connect(this.audioContext.destination);
    },

    createRobotEffectFilter() {
      if (!this.audioContext) return;

      const distortionNode = this.audioContext.createWaveShaper();
      distortionNode.curve = this.makeDistortionCurve(400);
      distortionNode.oversample = "4x";

      const playbackRateNode = this.audioContext.createBufferSource();
      playbackRateNode.playbackRate.value = 1.5;

      playbackRateNode.connect(distortionNode);
      distortionNode.connect(this.audioContext.destination);

      playbackRateNode.start(0);

      return distortionNode;
    },

    makeDistortionCurve(amount) {
      const k = typeof amount === "number" ? amount : 50;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      let x;
      for (let i = 0; i < n_samples; ++i) {
        x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    },
    createReverbEffectFilter() {
      if (!this.audioContext) return;

      const convolver = this.audioContext.createConvolver();
      const noiseBuffer = this.audioContext.createBuffer(
        2,
        this.audioContext.sampleRate * 3,
        this.audioContext.sampleRate
      );

      for (let channel = 0; channel < noiseBuffer.numberOfChannels; channel++) {
        const nowBuffering = noiseBuffer.getChannelData(channel);
        for (let i = 0; i < noiseBuffer.length; i++) {
          nowBuffering[i] = Math.random() * 2 - 1;
        }
      }

      convolver.buffer = noiseBuffer;

      this.filter = convolver;
      return convolver;
    },
    // createReverbEffectFilter() {
    //   if (!this.audioContext) return;

    //   const delayNode = this.audioContext.createDelay();
    //   delayNode.delayTime.setValueAtTime(0.06, this.audioContext.currentTime);

    //   const feedbackGain = this.audioContext.createGain();
    //   feedbackGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);

    //   const wetGain = this.audioContext.createGain();
    //   wetGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);

    //   delayNode.connect(feedbackGain);
    //   feedbackGain.connect(delayNode);
    //   feedbackGain.connect(wetGain);
    //   wetGain.connect(this.audioContext.destination);

    //   return delayNode;
    // },
    createDelayEffectFilter() {
      if (!this.audioContext) return;

      this.delayNode = this.audioContext.createDelay();
      this.delayNode.delayTime.setValueAtTime(
        0.5,
        this.audioContext.currentTime
      );

      return this.delayNode;
    },
    createEqualizerEffectFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      filter.gain.setValueAtTime(15, this.audioContext.currentTime);
      return filter;
    },
    createChorusEffectFilter() {
      if (!this.audioContext) return;

      const delayNode = this.audioContext.createDelay();
      delayNode.delayTime.setValueAtTime(0.03, this.audioContext.currentTime);

      const depth = this.audioContext.createGain();
      depth.gain.setValueAtTime(0.002, this.audioContext.currentTime);

      const lfo = this.audioContext.createOscillator();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(1.5, this.audioContext.currentTime);
      lfo.connect(depth);
      depth.connect(delayNode.delayTime);
      lfo.start();

      return delayNode;
    },
    createPitchShiftEffectFilter() {
      if (!this.audioContext) return;

      this.pitchShifterNode = this.audioContext.createBiquadFilter();
      this.pitchShifterNode.type = "allpass";
      this.pitchShifterNode.frequency.setValueAtTime(
        1000,
        this.audioContext.currentTime
      );

      return this.pitchShifterNode;
    },

    
    createPopFilter() {
      if (!this.audioContext) return;

      const bassBoost = this.audioContext.createBiquadFilter();
      bassBoost.type = "lowshelf";
      bassBoost.frequency.setValueAtTime(100, this.audioContext.currentTime);
      bassBoost.gain.setValueAtTime(5, this.audioContext.currentTime);

      const midBoost = this.audioContext.createBiquadFilter();
      midBoost.type = "peaking";
      midBoost.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      midBoost.gain.setValueAtTime(3, this.audioContext.currentTime);
      midBoost.Q.setValueAtTime(1, this.audioContext.currentTime);

      const trebleBoost = this.audioContext.createBiquadFilter();
      trebleBoost.type = "highshelf";
      trebleBoost.frequency.setValueAtTime(
        10000,
        this.audioContext.currentTime
      );
      trebleBoost.gain.setValueAtTime(5, this.audioContext.currentTime);

      bassBoost.connect(midBoost);
      midBoost.connect(trebleBoost);

      this.filter = bassBoost;
      return bassBoost;
    },
    createStereoEffectFilter() {
      if (!this.audioContext) return;

      const splitter = this.audioContext.createChannelSplitter(2);
      const merger = this.audioContext.createChannelMerger(2);

      const gainNodeL = this.audioContext.createGain();
      gainNodeL.gain.setValueAtTime(1.5, this.audioContext.currentTime);

      const gainNodeR = this.audioContext.createGain();
      gainNodeR.gain.setValueAtTime(0.5, this.audioContext.currentTime);

      splitter.connect(gainNodeL, 0);
      splitter.connect(gainNodeR, 1);
      gainNodeL.connect(merger, 0, 0);
      gainNodeR.connect(merger, 0, 1);

      this.source.connect(splitter);
      merger.connect(this.audioContext.destination);

      return merger;
    },
    createBassBoostFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowshelf";
      filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
      filter.gain.setValueAtTime(10, this.audioContext.currentTime);
      return filter;
    },
    createTrebleBoostFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highshelf";
      filter.frequency.setValueAtTime(3000, this.audioContext.currentTime);
      filter.gain.setValueAtTime(15, this.audioContext.currentTime);
      return filter;
    },
    applyChildVoiceFilter() {
      if (!this.audioContext) return;

      const pitchShiftFilter = this.audioContext.createBiquadFilter();
      pitchShiftFilter.type = "peaking";
      pitchShiftFilter.frequency.setValueAtTime(
        1000,
        this.audioContext.currentTime
      );
      pitchShiftFilter.gain.setValueAtTime(10, this.audioContext.currentTime);

      const playbackRateNode = this.audioContext.createGain();
      playbackRateNode.gain.setValueAtTime(1.5, this.audioContext.currentTime); // Speed up playback

      this.filter = pitchShiftFilter;
      this.connectNodes();
      this.source.connect(playbackRateNode);
      playbackRateNode.connect(this.audioContext.destination);
    },
    async saveVideo() {
      if (!this.uploadedFile || this.saveInProgress) return;

      const { playbackRate, uploadedFile, selectedFilter } = this;
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

      this.saveInProgress = true;

      await this.ffmpeg.load();
      this.ffmpeg.FS("writeFile", "input.mp4", await fetchFile(uploadedFile));

      let filterCommand = "";

      switch (selectedFilter) {
        case "highPitch":
          filterCommand = "highshelf=f=1000:g=25";
          break;
        case "BoldSound":
          filterCommand = "atempo=1.0,asetrate=44100*2/3";
          break;
        case "ThinSound":
          filterCommand = "atempo=1.0,asetrate=44100*1.5";
          break;
        case "female":
          filterCommand = "highpass=f=200,lowpass=f=3000";
          break;
        case "underwater":
          filterCommand = "lowpass=f=800,highpass=f=100,adelay=300|300";
          break;
        case "echo":
          filterCommand = "aecho=0.8:0.88:60:0.4";
          break;
        case "robot":
          filterCommand = "afftdn=nf=-20,areverse,afftdn=nf=-20,areverse";
          break;
        case "reverb":
          filterCommand = "aecho=0.8:0.88:6:0.4";
          break;
        case "delay":
          filterCommand = "adelay=500|500";
          break;
        case "equalizer":
          filterCommand = "equalizer=f=1000:t=q:w=1:g=15";
          break;
        case "chorus":
          filterCommand = "chorus=0.7:0.9:55:0.4:0.25:2";
          break;
        case "pitchShift":
          filterCommand = "rubberband=pitch=1.5";
          break;
        case "bassBoost":
          filterCommand = "bass=g=15:f=100";
          break;
        case "trebleBoost":
          filterCommand = "treble=g=15:f=3000";
          break;
        case "pop":
          //   filterCommand = "bass=g=10:f=100,treble=g=10:f=3000";
          filterCommand =
            "equalizer=f=100:width_type=h:width=200:g=5,equalizer=f=1000:width_type=h:width=2000:g=3,equalizer=f=10000:width_type=h:width=2000:g=5";
          break;
        case "stereo":
          //   filterCommand = "pan=stereo|c0=1.5*c0|c1=0.5*c1";
          filterCommand = "pan=stereo|c0=1.0*c0|c1=1.0*c1";
          break;
        case "childVoice":
          filterCommand = "atempo=0.9,asetrate=44100*1.5"; // سرعة الصوت وزيادة معدل التردد لتحويل الصوت إلى صوت طفل
          break;
      }

      const videoFilter = `setpts=${1 / playbackRate}*PTS`;
      const audioFilter = `atempo=${playbackRate}`;

      await this.ffmpeg.run(
        "-i",
        "input.mp4",
        "-vf",
        videoFilter,
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
