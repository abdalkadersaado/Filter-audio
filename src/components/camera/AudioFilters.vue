<!-- src/components/AudioFilters.vue -->
<template>
  <div>
    <label>
      <input type="checkbox" v-model="filters.pop" />
      Pop
    </label>
    <label>
      <input type="checkbox" v-model="filters.revert" />
      Revert
    </label>
    <label>
      <input type="checkbox" v-model="filters.highPitch" />
      High Pitch
    </label>
    <label>
      <input type="checkbox" v-model="filters.lowPass" />
      Low Pass
    </label>
  </div>
</template>

<script>
export default {
  data() {
    return {
      filters: {
        pop: false,
        revert: false,
        highPitch: false,
        lowPass: false,
      },
    };
  },
  methods: {
    applyFilters(audioContext, audioBuffer) {
      // Create an audio buffer source node
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Create filter nodes
      const highPassFilter = audioContext.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 1000; // Adjust frequency as needed

      const lowPassFilter = audioContext.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 1000; // Adjust frequency as needed

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1; // Adjust gain as needed

      // Connect the nodes
      source.connect(highPassFilter);
      highPassFilter.connect(lowPassFilter);
      lowPassFilter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Start playback
      source.start();
    },
  },
};
</script>

<style scoped>
/* Add any styles you need */
</style>
