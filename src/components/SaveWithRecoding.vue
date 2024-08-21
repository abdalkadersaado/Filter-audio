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
      <button @click="startRecording" v-if="fileLoaded && !isRecording">
        Start Recording
      </button>
      <button @click="stopRecording" v-if="isRecording">Stop Recording</button>
      <button @click="saveVideo" v-if="fileLoaded || recordedChunks.length > 0">
        Save Video
      </button>
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
      mediaRecorder: null,
      recordedChunks: [],
      errorMessage: "",
      fileLoaded: false,
      playbackRate: 1,
      isRecording: false,
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
    // resetFilters() {
    //   if (this.source) {
    //     this.source.disconnect();
    //     this.source.connect(this.audioContext.destination);
    //   }
    //   this.filters = [];
    // },
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
    startRecording() {
      if (!this.audioContext) {
        this.errorMessage = "AudioContext is not initialized.";
        return;
      }

      const videoElement = this.$refs.video;
      const stream = videoElement.captureStream();
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = this.handleStopRecording;

      this.mediaRecorder.start();
      this.isRecording = true;
    },
    stopRecording() {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        this.isRecording = false;
      }
    },
    handleStopRecording() {
      const blob = new Blob(this.recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "filtered-video.webm";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    saveVideo() {
      this.handleStopRecording();
    },
    createHighPitchFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "highshelf";
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      filter.gain.setValueAtTime(10, this.audioContext.currentTime);
      return filter;
    },
    createFemaleVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
      filter.Q.setValueAtTime(1, this.audioContext.currentTime);
      filter.gain.setValueAtTime(6, this.audioContext.currentTime);
      return filter;
    },
    createHallEffectFilter() {
      if (!this.audioContext || !this.convolverBuffer) return;
      const convolver = this.audioContext.createConvolver();
      convolver.buffer = this.convolverBuffer;
      return convolver;
    },
    createUnderwaterEffectFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowshelf";
      filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
      filter.gain.setValueAtTime(15, this.audioContext.currentTime);
      return filter;
    },
    createEchoEffectFilter() {
      if (!this.audioContext) return;
      const delayNode = this.audioContext.createDelay();
      delayNode.delayTime.setValueAtTime(0.5, this.audioContext.currentTime);

      const feedback = this.audioContext.createGain();
      feedback.gain.setValueAtTime(0.8, this.audioContext.currentTime);

      const filter = this.audioContext.createBiquadFilter();
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);

      delayNode.connect(feedback);
      feedback.connect(filter);
      filter.connect(delayNode);

      this.delayNode = delayNode;
    },
    createRobotEffectFilter() {
      if (!this.audioContext) return;
      const waveShaper = this.audioContext.createWaveShaper();

      function makeDistortionCurve(amount) {
        const k = typeof amount === "number" ? amount : 50;
        const nSamples = 44100;
        const curve = new Float32Array(nSamples);
        const deg = Math.PI / 180;
        for (let i = 0; i < nSamples; ++i) {
          const x = (i * 2) / nSamples - 1;
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
      }

      waveShaper.curve = makeDistortionCurve(400);
      waveShaper.oversample = "4x";

      return waveShaper;
    },
    createReverbEffectFilter() {
      if (!this.audioContext || !this.convolverBuffer) return;
      const convolver = this.audioContext.createConvolver();
      convolver.buffer = this.convolverBuffer;
      return convolver;
    },
    createDelayEffectFilter() {
      if (!this.audioContext) return;
      const delayNode = this.audioContext.createDelay();
      delayNode.delayTime.setValueAtTime(0.5, this.audioContext.currentTime);

      const feedback = this.audioContext.createGain();
      feedback.gain.setValueAtTime(0.8, this.audioContext.currentTime);

      const filter = this.audioContext.createBiquadFilter();
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);

      delayNode.connect(feedback);
      feedback.connect(filter);
      filter.connect(delayNode);

      this.delayNode = delayNode;
    },
    createEqualizerEffectFilter() {
      if (!this.audioContext) return;
      const equalizerBands = [
        { frequency: 32, gain: 0 },
        { frequency: 64, gain: 0 },
        { frequency: 125, gain: 0 },
        { frequency: 250, gain: 0 },
        { frequency: 500, gain: 0 },
        { frequency: 1000, gain: 0 },
        { frequency: 2000, gain: 0 },
        { frequency: 4000, gain: 0 },
        { frequency: 8000, gain: 0 },
        { frequency: 16000, gain: 0 },
      ];

      const filters = equalizerBands.map((band) => {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = band.frequency;
        filter.Q.value = 1;
        filter.gain.value = band.gain;
        return filter;
      });

      this.source.disconnect();
      filters
        .reduce((prev, curr) => {
          prev.connect(curr);
          return curr;
        }, this.source)
        .connect(this.audioContext.destination);
    },
    createChorusEffectFilter() {
      if (!this.audioContext) return;
      const delayNode = this.audioContext.createDelay();
      delayNode.delayTime.value = 0.03;

      const lfo = this.audioContext.createOscillator();
      const lfoGain = this.audioContext.createGain();
      lfo.frequency.value = 1.5;
      lfoGain.gain.value = 0.015;

      lfo.connect(lfoGain).connect(delayNode.delayTime);
      lfo.start();

      return delayNode;
    },
    createPitchShiftEffectFilter() {
      if (!this.audioContext) return;
      const scriptProcessor = this.audioContext.createScriptProcessor(
        1024,
        1,
        1
      );

      let pitchRatio = 1.5;

      scriptProcessor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;

        for (
          let channel = 0;
          channel < outputBuffer.numberOfChannels;
          channel++
        ) {
          const inputData = inputBuffer.getChannelData(channel);
          const outputData = outputBuffer.getChannelData(channel);

          for (let sample = 0; sample < inputBuffer.length; sample++) {
            outputData[sample] =
              inputData[Math.floor(sample / pitchRatio)] || 0;
          }
        }
      };

      return scriptProcessor;
    },
    createPopFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
      filter.Q.setValueAtTime(1, this.audioContext.currentTime);
      filter.gain.setValueAtTime(6, this.audioContext.currentTime);
      return filter;
    },
    createBassBoostFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowshelf";
      filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
      filter.gain.setValueAtTime(15, this.audioContext.currentTime);
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
    createAdvancedEchoFilter() {
      if (!this.audioContext) return;
      const delayNode = this.audioContext.createDelay();
      delayNode.delayTime.setValueAtTime(0.5, this.audioContext.currentTime);

      const feedback = this.audioContext.createGain();
      feedback.gain.setValueAtTime(0.8, this.audioContext.currentTime);

      const filter = this.audioContext.createBiquadFilter();
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);

      delayNode.connect(feedback);
      feedback.connect(filter);
      filter.connect(delayNode);

      this.delayNode = delayNode;
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

      return whiteNoise;
    },
    createWomanVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
      filter.Q.setValueAtTime(1, this.audioContext.currentTime);
      filter.gain.setValueAtTime(6, this.audioContext.currentTime);
      return filter;
    },
    createChildVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
      filter.Q.setValueAtTime(1, this.audioContext.currentTime);
      filter.gain.setValueAtTime(8, this.audioContext.currentTime);
      return filter;
    },
    createYoungManVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      filter.Q.setValueAtTime(1, this.audioContext.currentTime);
      filter.gain.setValueAtTime(4, this.audioContext.currentTime);
      return filter;
    },
    createElderlyManVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(500, this.audioContext.currentTime);
      filter.Q.setValueAtTime(1, this.audioContext.currentTime);
      filter.gain.setValueAtTime(2, this.audioContext.currentTime);
      return filter;
    },
    createElderlyWomanVoiceFilter() {
      if (!this.audioContext) return;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      filter.Q.setValueAtTime(1, this.audioContext.currentTime);
      filter.gain.setValueAtTime(4, this.audioContext.currentTime);
      return filter;
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
