import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
const ffmpeg = createFFmpeg({
  log: true,
});

export const loadFFmpeg = async () => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }
};

export const applyFilter = async (inputFile, filter) => {
  await loadFFmpeg();
  ffmpeg.FS("writeFile", "input.mp4", await fetchFile(inputFile));
  await ffmpeg.run("-i", "input.mp4", "-af", filter, "output.mp4");
  const data = ffmpeg.FS("readFile", "output.mp4");
  console.log(data);
  return URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
};
