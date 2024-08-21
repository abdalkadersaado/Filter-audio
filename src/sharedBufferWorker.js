// ffmpegWorker.js

import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

// const MEMORY = 512 * 1024 * 1024; // 512 MB
let ffmpeg = null;

async function getFFmpeg() {
  if (!ffmpeg) {
    ffmpeg = createFFmpeg({
      log: true,
      MEMFS: [],
    });
    await ffmpeg.load();
  }
  return ffmpeg;
}

self.onmessage = async function (e) {
    const { uploadedFileBuffer, selectedFilter, playbackRate, startTime } = e.data;
  
    try {
      const ffmpegInstance = await getFFmpeg();
  
      // تحميل الملف إلى الذاكرة
      const uploadedFile = new Uint8Array(uploadedFileBuffer);
      ffmpegInstance.FS('writeFile', 'input.mp4', uploadedFile);
  
      let filterCommand = "";
      switch (selectedFilter) {
        case "highPitch":
          filterCommand = "highshelf=f=1000:g=25";
          break;
      }
  
      const videoFilter = `setpts=${1 / playbackRate}*PTS`;
      const audioFilter = `atempo=${playbackRate}`;
  
      // تتبع التقدم
      ffmpegInstance.setProgress((p) => {
        const elapsedTime = (Date.now() - startTime) / 1000;
        const totalEstimatedTime = elapsedTime / p.ratio;
        const remainingTime = totalEstimatedTime - elapsedTime;
        self.postMessage({ progress: p.ratio, remainingTime });
      });
  
      // تنفيذ عملية المعالجة
      await ffmpegInstance.run(
        "-i",
        "input.mp4",
        "-vf",
        videoFilter,
        "-af",
        filterCommand ? `${filterCommand},${audioFilter}` : audioFilter,
        "output.mp4"
      );
  
      // قراءة النتيجة
      const data = ffmpegInstance.FS('readFile', 'output.mp4');
      const sharedBuffer = new SharedArrayBuffer(data.length);
      const resultArray = new Uint8Array(sharedBuffer);
      resultArray.set(data);
  
      self.postMessage({ url: URL.createObjectURL(new Blob([resultArray], { type: 'video/mp4' })), sharedBuffer });
    } catch (error) {
      self.postMessage({ error: error.message });
    } finally {
      // تنظيف الموارد
      if (ffmpeg) {
        ffmpeg.FS('unlink', 'input.mp4');
        ffmpeg.FS('unlink', 'output.mp4');
      }
    }
  };
