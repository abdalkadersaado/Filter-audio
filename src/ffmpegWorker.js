// ffmpegWorker.js

import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

// const MEMORY = 512 * 1024 * 1024; // 512 MB
let ffmpeg = null;

async function getFFmpeg() {
  if (!ffmpeg) {
    ffmpeg = createFFmpeg({
      log: true,
    //   MEMFS: [{ name: "input.mp4", data: new Uint8Array(MEMORY) }],
      MEMFS: [],
    });
    await ffmpeg.load();
  }
  return ffmpeg;
}
// const ffmpeg = createFFmpeg({
//   log: true,
//   MEMFS: [{ name: 'input.mp4', data: new Uint8Array(MEMORY) }]
// });

self.onmessage = async function (e) {
  console.log(e);
  const {
    uploadedFile,
    selectedFilter,
    playbackRate,
    startTime,
    scaleWidth,
    scaleHeight,
  } = e.data;

  try {
    // if (!ffmpeg.isLoaded()) {
    //   await ffmpeg.load();
    // }
    const ffmpegInstance = await getFFmpeg();
    ffmpegInstance.FS("writeFile", "input.mp4", await fetchFile(uploadedFile));

    let filterCommand = "";
    switch (selectedFilter) {
      case "highPitch":
        filterCommand = "highshelf=f=1000:g=25";
        break;
      case "BoldSound":
        filterCommand = "atempo=1.0,asetrate=44100*2/3";
        break;
    }

    const videoFilter = `setpts=${1 / playbackRate}*PTS${
      scaleWidth && scaleHeight
        ? ",scale=" + scaleWidth + ":" + scaleHeight
        : ""
    }`;
    const audioFilter = `atempo=${playbackRate}`;

    ffmpegInstance.setProgress((p) => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const totalEstimatedTime = elapsedTime / p.ratio;
      const remainingTime = totalEstimatedTime - elapsedTime;
      self.postMessage({ progress: p.ratio, remainingTime });
    });

    await ffmpegInstance.run(
      "-i",
      "input.mp4",
      "-vf",
      videoFilter,
      "-af",
      filterCommand ? `${filterCommand},${audioFilter}` : audioFilter,
      "output.mp4"
    );

    const data = ffmpegInstance.FS("readFile", "output.mp4");
    const videoBlob = new Blob([data.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(videoBlob);
    self.postMessage({ url });
  } catch (error) {
    self.postMessage({ error: error.message });
  } finally {
    if (ffmpeg.isLoaded()) {
      ffmpeg.FS("unlink", "input.mp4");
      ffmpeg.FS("unlink", "output.mp4");
    }
  }
};
