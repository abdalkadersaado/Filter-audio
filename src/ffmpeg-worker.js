import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

self.onmessage = async (event) => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const { file, command } = event.data;
  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
  await ffmpeg.run(...command);
  const data = ffmpeg.FS('readFile', 'output.mp4');
  self.postMessage({ data });
};
