import { createFFmpeg } from "@ffmpeg/ffmpeg";

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
      fileBlobURL,
      selectedFilters,
      playbackRate,
      startTime,
      scaleWidth,
      scaleHeight,
    } = e.data;
  
    try {
      const ffmpegInstance = await getFFmpeg();
  
      // Fetch file from Blob URL
      const response = await fetch(fileBlobURL);
      const fileArrayBuffer = await response.arrayBuffer();
      ffmpegInstance.FS("writeFile", "input.mp4", new Uint8Array(fileArrayBuffer));
  
      let audioFilterCommands = [];
      let videoFilterCommand = `setpts=${1 / playbackRate}*PTS${
        scaleWidth && scaleHeight
          ? ",scale=" + scaleWidth + ":" + scaleHeight
          : ""
      }`;
      const audioTempoFilter = `atempo=${playbackRate}`;
  
      // Build audio filter commands based on selected filters
      selectedFilters.forEach(filter => {
        switch (filter) {
          case "highPitch":
            audioFilterCommands.push("highshelf=f=1000:g=25");
            break;
          case "lowPitch":
            audioFilterCommands.push("lowshelf=f=300:g=-25");
            break;
          case "echo":
            audioFilterCommands.push("aecho=0.8:0.9:1000:0.3");
            break;
          default:
            break;
        }
      });
  
      // Combine all audio filter commands
      const combinedAudioFilterCommand = audioFilterCommands.length
        ? audioFilterCommands.join(",") + "," + audioTempoFilter
        : audioTempoFilter;
  
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
        combinedAudioFilterCommand,
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
