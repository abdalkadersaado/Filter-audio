import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

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
  const {
    uploadedFile,
    selectedFilter,
    playbackRate,
    startTime,
    scaleWidth,
    scaleHeight,
  } = e.data;

  try {
    const ffmpegInstance = await getFFmpeg();
    ffmpegInstance.FS("writeFile", "input.mp4", await fetchFile(uploadedFile));

    let audioFilterCommand = "";
    let videoFilterCommand = "";

    switch (selectedFilter) {
      case "highPitch":
        audioFilterCommand = "highshelf=f=1000:g=25";
        break;
      case "lowPitch":
        audioFilterCommand = "lowshelf=f=300:g=-25";
        break;
      case "echo":
        audioFilterCommand = "aecho=0.8:0.9:1000:0.3"; // Echo with 500 ms delay and feedback
        break;
      // Add more cases for additional filters
      default:
        audioFilterCommand = "";
    }

    videoFilterCommand = `setpts=${1 / playbackRate}*PTS${
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
      videoFilterCommand,
      "-af",
      audioFilterCommand ? `${audioFilterCommand},${audioFilter}` : audioFilter,
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
