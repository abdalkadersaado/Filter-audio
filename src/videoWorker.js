// videoWorker.js

self.importScripts("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@latest");

const ffmpeg = createFFmpeg({ log: true });

self.onmessage = async function (e) {
  const { uploadedFile, selectedFilter, playbackRate, startTime } = e.data;

  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  ffmpeg.FS("writeFile", "input.mp4", await fetchFile(uploadedFile));

  let filterCommand = "";
  switch (selectedFilter) {
    case "highPitch":
      filterCommand = "highshelf=f=1000:g=25";
      break;
  }

  const videoFilter = `setpts=${1 / playbackRate}*PTS`;
  const audioFilter = `atempo=${playbackRate}`;

  ffmpeg.setProgress((p) => {
    const elapsedTime = (Date.now() - startTime) / 1000;
    const totalEstimatedTime = elapsedTime / p.ratio;
    const remainingTime = totalEstimatedTime - elapsedTime;
    self.postMessage({ progress: p.ratio, remainingTime });
  });

  await ffmpeg.run(
    "-i",
    "input.mp4",
    "-vf",
    videoFilter,
    "-af",
    filterCommand ? `${filterCommand},${audioFilter}` : audioFilter,
    "output.mp4"
  );

  const data = ffmpeg.FS("readFile", "output.mp4");
  const videoBlob = new Blob([data.buffer], { type: "video/mp4" });
  const url = URL.createObjectURL(videoBlob);

  self.postMessage({ url });
};
