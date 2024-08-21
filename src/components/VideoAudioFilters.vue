<template>
  <div id="app">
    <h1>Video Audio Filters</h1>
    <input type="file" @change="handleFileUpload" accept="video/*" />
    <video ref="video" controls @play="setupAudioContext"></video>
    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    <div v-if="fileLoaded">
      <button @click="applyFilter('highPitch')">High Pitch</button>
      <button @click="applyFilter('female')">Female Voice</button>
      <button @click="applyFilter('hall')">Hall Effect</button>
      <button @click="applyFilter('underwater')">Underwater Effect</button>
      <button @click="applyFilter('echo')">Echo Effect</button>
      <button @click="applyFilter('robot')">Robot Effect</button>
      <button @click="applyFilter('reverb')">Reverb</button>
      <button @click="applyFilter('delay')">Delay</button>
      <button @click="applyFilter('equalizer')">Equalizer</button>
      <button @click="applyFilter('chorus')">Chorus</button>
      <button @click="applyFilter('pitchShift')">Pitch Shift</button>
      <button @click="applyFilter('pop')">Pop</button>
      <button @click="applyFilter('bassBoost')">Bass Boost</button>
      <button @click="applyFilter('trebleBoost')">Treble Boost</button>
      <button @click="applyFilter('advancedEcho')">Advanced Echo</button>
      <button @click="applyFilter('whiteNoise')">White Noise</button>
      <button @click="applyFilter('woman')">Woman Voice</button>
      <button @click="applyFilter('child')">Child Voice</button>
      <button @click="applyFilter('youngMan')">Young Man Voice</button>
      <button @click="applyFilter('girl')">Girl Voice</button>
      <button @click="speedUpAudio">Speed Up</button>
      <input
        type="range"
        min="0.5"
        max="3.0"
        step="0.1"
        v-model="playbackRate"
        @input="updatePlaybackRate"
      />
      <div>Playback Speed: {{ playbackRate }}x</div>
      <button @click="resetFilters">Reset Filters</button>
    </div>
  </div>
</template>

<script>
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
    };
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file || !file.type.startsWith("video/")) {
        this.errorMessage = "Please upload a valid video file.";
        return;
      }
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

        const response = await fetch("path/to/hall-impulse-response.wav");
        const arrayBuffer = await response.arrayBuffer();
        this.convolverBuffer = await this.audioContext.decodeAudioData(
          arrayBuffer
        );

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

      switch (type) {
        case "highPitch":
          this.filter = this.createHighPitchFilter();
          break;
        case "female":
          this.filter = this.createFemaleVoiceFilter();
          break;
        case "hall":
          this.filter = this.createHallEffectFilter();
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
          break;
        case "equalizer":
          this.createEqualizerEffectFilter();
          return;
        case "chorus":
          this.filter = this.createChorusEffectFilter();
          break;
        case "pitchShift":
          this.pitchShifterNode = this.createPitchShiftEffectFilter();
          break;
        case "speedUp":
          this.speedUpAudio();
          return;
        case "pop":
          this.filter = this.createPopFilter();
          break;
        case "bassBoost":
          this.filter = this.createBassBoostFilter();
          break;
        case "trebleBoost":
          this.filter = this.createTrebleBoostFilter();
          break;
        case "advancedEcho":
          this.createAdvancedEchoFilter();
          break;
        case "whiteNoise":
          this.createWhiteNoiseFilter();
          break;
        case "woman":
          this.filter = this.createWomanVoiceFilter();
          break;
        case "child":
          this.filter = this.createChildVoiceFilter();
          break;
        case "youngMan":
          this.filter = this.createYoungManVoiceFilter();
          break;
        case "girl":
          this.filter = this.createGirlVoiceFilter();
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
        if (this.delayNode) {
          this.source.connect(this.delayNode);
        }
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
      if (this.delayNode) {
        this.delayNode.disconnect();
        this.delayNode = null;
      }
      if (this.pitchShifterNode) {
        this.pitchShifterNode.disconnect();
        this.pitchShifterNode = null;
      }

      const videoElement = this.$refs.video;
      videoElement.playbackRate = this.playbackRate;
    },
    speedUpAudio() {
      const videoElement = this.$refs.video;
      videoElement.playbackRate = 2.0;
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
    createFemaleVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(300, this.audioContext.currentTime);
      return filter;
    },
    createHallEffectFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createConvolver();
      filter.buffer = this.convolverBuffer;
      return filter;
    },
    createUnderwaterEffectFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(300, this.audioContext.currentTime);
      return filter;
    },
    createEchoEffectFilter() {
      if (!this.audioContext) return;
      this.delayNode = this.audioContext.createDelay();
      this.delayNode.delayTime.setValueAtTime(
        0.5,
        this.audioContext.currentTime
      );
      this.filter = this.audioContext.createGain();
      this.filter.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      this.delayNode.connect(this.filter);
      this.filter.connect(this.delayNode);
    },
    createAdvancedEchoFilter() {
      if (!this.audioContext) return;
      const delayNode1 = this.audioContext.createDelay();
      delayNode1.delayTime.setValueAtTime(0.3, this.audioContext.currentTime);
      const delayNode2 = this.audioContext.createDelay();
      delayNode2.delayTime.setValueAtTime(0.6, this.audioContext.currentTime);
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
      this.source.connect(delayNode1);
      delayNode1.connect(gainNode);
      gainNode.connect(delayNode2);
      delayNode2.connect(this.audioContext.destination);
    },
    createWhiteNoiseFilter() {
      if (!this.audioContext) return;
      const bufferSize = 2 * this.audioContext.sampleRate;
      const noiseBuffer = this.audioContext.createBuffer(
        1,
        bufferSize,
        this.audioContext.sampleRate
      );
      const output = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      whiteNoise.start(0);
      whiteNoise.connect(this.audioContext.destination);

      this.filter = whiteNoise;
    },
    createRobotEffectFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createWaveShaper();
      filter.curve = this.makeDistortionCurve(400);
      filter.oversample = "4x";
      return filter;
    },
    createReverbEffectFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createConvolver();
      filter.buffer = this.convolverBuffer;
      return filter;
    },
    createDelayEffectFilter() {
      if (!this.audioContext) return;
      this.delayNode = this.audioContext.createDelay();
      this.delayNode.delayTime.setValueAtTime(
        0.5,
        this.audioContext.currentTime
      );
      this.filter = this.audioContext.createGain();
      this.filter.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      this.delayNode.connect(this.filter);
      this.filter.connect(this.audioContext.destination);
    },
    createEqualizerEffectFilter() {
      if (!this.audioContext) return;
      this.filter = this.audioContext.createGain();
      const lowFilter = this.audioContext.createBiquadFilter();
      lowFilter.type = "lowshelf";
      lowFilter.frequency.setValueAtTime(320, this.audioContext.currentTime);
      lowFilter.gain.setValueAtTime(6, this.audioContext.currentTime);

      const midFilter = this.audioContext.createBiquadFilter();
      midFilter.type = "peaking";
      midFilter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      midFilter.Q.setValueAtTime(1, this.audioContext.currentTime);
      midFilter.gain.setValueAtTime(6, this.audioContext.currentTime);

      const highFilter = this.audioContext.createBiquadFilter();
      highFilter.type = "highshelf";
      highFilter.frequency.setValueAtTime(3200, this.audioContext.currentTime);
      highFilter.gain.setValueAtTime(6, this.audioContext.currentTime);

      this.source.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);
      highFilter.connect(this.audioContext.destination);
    },
    createChorusEffectFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createDelay();
      filter.delayTime.setValueAtTime(0.03, this.audioContext.currentTime);
      const depth = this.audioContext.createGain();
      depth.gain.setValueAtTime(0.002, this.audioContext.currentTime);
      const lfo = this.audioContext.createOscillator();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(1.5, this.audioContext.currentTime);
      lfo.connect(depth);
      depth.connect(filter.delayTime);
      lfo.start();
      return filter;
    },
    createPitchShiftEffectFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createWaveShaper();
      filter.curve = this.makeDistortionCurve(700);
      filter.oversample = "4x";
      return filter;
    },
    createPopFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
      filter.Q.setValueAtTime(1, this.audioContext.currentTime);
      return filter;
    },
    createBassBoostFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowshelf";
      filter.frequency.setValueAtTime(150, this.audioContext.currentTime);
      filter.gain.setValueAtTime(10, this.audioContext.currentTime);
      return filter;
    },
    createTrebleBoostFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highshelf";
      filter.frequency.setValueAtTime(3000, this.audioContext.currentTime);
      filter.gain.setValueAtTime(10, this.audioContext.currentTime);
      return filter;
    },
    createWomanVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highshelf";
      filter.frequency.setValueAtTime(300, this.audioContext.currentTime);
      filter.gain.setValueAtTime(10, this.audioContext.currentTime);
      return filter;
    },
    createChildVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highshelf";
      filter.frequency.setValueAtTime(600, this.audioContext.currentTime);
      filter.gain.setValueAtTime(20, this.audioContext.currentTime);
      return filter;
    },
    createYoungManVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(150, this.audioContext.currentTime);
      filter.gain.setValueAtTime(6, this.audioContext.currentTime);
      return filter;
    },
    createGirlVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highshelf";
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      filter.gain.setValueAtTime(20, this.audioContext.currentTime);
      return filter;
    },
    makeDistortionCurve(amount) {
      const k = typeof amount === "number" ? amount : 50;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    },
  },
};
</script>

<style scoped>
#app {
  text-align: center;
  margin-top: 50px;
}

video {
  width: 80%;
  margin-top: 20px;
  border: 2px solid #ccc;
  border-radius: 10px;
}

button {
  margin: 10px 5px;
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #45a049;
}

button:focus {
  outline: none;
}

.error {
  color: red;
  margin-top: 10px;
  font-weight: bold;
}

input[type="range"] {
  width: 50%;
  margin-top: 20px;
}
</style>
