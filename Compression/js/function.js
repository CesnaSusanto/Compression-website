document.getElementById("upload").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  // drag and drop function
  //   const dropArea = getElementById("upload-area");
  //   dropArea.addEventListener("", function (e) {
  //     e.preventDefault();
  //   });
  //   dropArea.addEventListener("drop", function (e) {
  //     e.preventDefault();
  //     file.files = e.dataTransfer.files;
  //     reader();
  //   });
  //   //

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");
      const maxWidth = 2000; // Maximum width for the compressed image
      const scaleSize = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scaleSize;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Compress the image
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.91); // 70% quality
      document.getElementById("output").src = compressedDataUrl;
      const downloadLink = document.getElementById("download");
      downloadLink.style.display = "block";
      downloadLink.href = compressedDataUrl;
      downloadLink.download = "compressed_image.jpg";
    };
    document.getElementById("output").style.display = "flex";
    document.getElementById("preview").style.display = "none";
    document.getElementById("download-button").style.display = "flex";
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});
