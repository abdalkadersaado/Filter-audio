<template>
  <router-view />
 
</template>

<script>
import { applyFilter } from './ffmpeg';

export default {
  data() {
    return {
      inputFile: null,
      filteredVideoUrl: null,
      selectedFilter: 'aresample=8000,asetrate=8000'
    };
  },
  methods: {
    handleFileUpload(event) {
      this.inputFile = event.target.files[0];
    },
    async applySelectedFilter() {
      if (this.inputFile && this.selectedFilter) {
        this.filteredVideoUrl = await applyFilter(this.inputFile, this.selectedFilter);
      }
    }
  }
};
</script>

<style>
video {
  max-width: 100%;
  height: auto;
  margin-top: 20px;
}
</style>
