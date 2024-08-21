<template>
  <div>
    <input type="file" @change="handleFileUpload" />
    <select v-model="selectedFilter">
      <option value="aresample=8000,asetrate=8000">صوت رفيع</option>
      <option value="aecho=0.8:0.9:1000:0.3">صوت ضمن كهف</option>
      <option value="afftdn=nf=-20">صوت تحت الماء</option>
      <option value="aecho=0.8:0.9:5000:0.7">صوت ضمن قاعة</option>
    </select>
    <button @click="applySelectedFilter">تطبيق الفلتر</button>
    <video v-if="filteredVideoUrl" :src="filteredVideoUrl" controls></video>
  </div>
</template>

<script>
import { applyFilter } from '@/ffmpeg';

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