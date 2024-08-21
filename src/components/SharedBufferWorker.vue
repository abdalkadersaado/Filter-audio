<template>
  <div>
    <input type="file" @change="handleFileUpload" accept="video/*" />
    <video ref="videoPlayer" controls></video>
    <button @click="testNotification">اختبار الإشعار</button>
    <button @click="showInstructions">تعليمات الإشعارات</button>
  </div>
</template>

<script>
import toastr from "toastr";
import "toastr/build/toastr.min.css";
import Push from "push.js";
export default {
  data() {
    return {
      worker: null,
      videoSrc: null,
      videoUrl: null,
    };
  },
  mounted() {
    this.worker = new Worker(new URL("@/ffmpeg-worker.js", import.meta.url));
    this.worker.onmessage = this.handleWorkerMessage;

    if (
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("إذن الإشعارات ممنوح.");
        } else {
          console.log("إذن الإشعارات مرفوض.");
        }
      });
    } else if (Notification.permission === "granted") {
      console.log("إذن الإشعارات كان ممنوحاً بالفعل.");
    }
  },
  methods: {
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.videoSrc = URL.createObjectURL(file);
        this.applyAudioEffects(file);
      }
    },
    applyAudioEffects(file) {
      // ضبط الدقة إلى 640x360 (يمكنك تعديل الدقة كما ترغب)
      const scale = "100:100";
      const command = [
        "-i",
        "input.mp4",
        "-vf",
        `scale=${scale}`,
        "-af",
        "aecho=0.8:0.9:1000:0.3",
        "output.mp4",
      ];
      this.worker.postMessage({ file, command });
    },
    handleWorkerMessage(event) {
      const { data } = event.data;
      const video = this.$refs.videoPlayer;
      video.src = URL.createObjectURL(
        new Blob([data.buffer], { type: "video/mp4" })
      );
      //   video.src = this.videoUrl;
      // إظهار الإشعار عند الانتهاء من معالجة الفيديو
      this.showNotification();
      this.showToastrNotification();
    },
    showNotification() {
      // if (Notification.permission === "granted") {
      //   new Notification("تمت معالجة الفيديو", {
      //     body: "الفيديو أصبح جاهزاً للعرض.",
      //     icon: require("@/assets/logo.png"),
      //   });
      // } else {
      //   alert("يرجى تمكين الإشعارات في إعدادات المتصفح.");
      // }
      if (Notification.permission === "granted") {
        Push.create("تمت معالجة الفيديو", {
          body: "الفيديو أصبح جاهزاً للعرض.",
          icon: require("@/assets/logo.png"),
          timeout: 5000, // مدة ظهور الإشعار (بالملي ثانية)
          vibrate: [200, 100, 200],
          onClick: function () {
            //   window.focus();
            // window.location.href = 'https://localhost:9000/save3';
            window.open("https://localhost:9000/save3", "_blank");
          },
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then(function (permission) {
          if (permission === "granted") {
            console.log("granted");
            Push.create("تمت معالجة الفيديو", {
              body: "الفيديو أصبح جاهزاً للعرض.",
              icon: require("@/assets/logo.png"),
              timeout: 5000, // مدة ظهور الإشعار (بالملي ثانية)
              vibrate: [200, 100, 200],
              onClick: function () {
                //   window.focus();
                // window.location.href = 'https://localhost:9000/save3';
                window.open("https://localhost:9000/save3", "_blank");
              },
            });
          }
        });
      }
    },
    showInstructions() {
      // توجيه المستخدم إلى تعليمات تعديل إعدادات الإشعارات
      // أو عرض رسالة تعليمية
      alert(
        "لتمكين الإشعارات، يرجى الذهاب إلى إعدادات المتصفح وتعديل الأذونات لموقعنا."
      );
    },
    showToastrNotification() {
      toastr.success("تمت معالجة الفيديو بنجاح!", "نجاح");
    },
    testNotification() {
      this.showNotification();
      this.showToastrNotification();
    },
  },
};
</script>
