document.addEventListener('DOMContentLoaded', function () {
  const qualitySelect = document.getElementById('quality-select');
  const loadingElement = document.getElementById('loading');

  const uploadArea = document.getElementById('upload-area');
  const uploadInput = document.getElementById('upload');

  uploadArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', function () {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadInput.files = files;
      handleFileUpload(files[0]);
    }
  });

  uploadInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  });

  function handleFileUpload(file) {
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

        // Show loading animation
        loadingElement.style.display = 'flex';

        // Compress the image using DCT
        setTimeout(() => {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const quality = parseFloat(qualitySelect.value);
          const compressedDataUrl = compressImageUsingDCT(imageData, quality);

          document.getElementById("output").src = compressedDataUrl;
          const downloadLink = document.getElementById("download");
          downloadLink.style.display = "block";
          downloadLink.href = compressedDataUrl;
          downloadLink.download = "compressed_image.jpg";

          // Hide loading animation
          loadingElement.style.display = 'none';
        }, 100);
      };
      document.getElementById("output").style.display = "flex";
      document.getElementById("preview").style.display = "none";
      document.getElementById("download-button").style.display = "flex";
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function compressImageUsingDCT(imageData, quality) {
    const { width, height, data } = imageData;
    const blockSize = 8;
    const dctData = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        const block = getBlock(data, width, x, y, blockSize);
        const dctBlock = applyDCT(block, blockSize);
        const quantizedBlock = quantizeBlock(dctBlock, quality, blockSize);
        const dequantizedBlock = dequantizeBlock(quantizedBlock, quality, blockSize);
        const idctBlock = applyIDCT(dequantizedBlock, blockSize);
        setBlock(dctData, width, x, y, idctBlock, blockSize);
      }
    }

    const compressedCanvas = document.createElement('canvas');
    compressedCanvas.width = width;
    compressedCanvas.height = height;
    const compressedCtx = compressedCanvas.getContext('2d');
    const compressedImageData = compressedCtx.createImageData(width, height);
    compressedImageData.data.set(dctData);
    compressedCtx.putImageData(compressedImageData, 0, 0);

    return compressedCanvas.toDataURL('image/jpeg', quality);
  }

  function getBlock(data, width, x, y, blockSize) {
    const block = [];
    for (let j = 0; j < blockSize; j++) {
      for (let i = 0; i < blockSize; i++) {
        const index = ((y + j) * width + (x + i)) * 4;
        block.push(data[index], data[index + 1], data[index + 2], data[index + 3]);
      }
    }
    return block;
  }

  function setBlock(data, width, x, y, block, blockSize) {
    for (let j = 0; j < blockSize; j++) {
      for (let i = 0; i < blockSize; i++) {
        const index = ((y + j) * width + (x + i)) * 4;
        data[index] = block[(j * blockSize + i) * 4];
        data[index + 1] = block[(j * blockSize + i) * 4 + 1];
        data[index + 2] = block[(j * blockSize + i) * 4 + 2];
        data[index + 3] = block[(j * blockSize + i) * 4 + 3];
      }
    }
  }

  function applyDCT(block, blockSize) {
    const dctBlock = new Array(blockSize * blockSize * 4).fill(0);
    for (let u = 0; u < blockSize; u++) {
      for (let v = 0; v < blockSize; v++) {
        for (let c = 0; c < 4; c++) { // Iterate over RGBA channels
          let sum = 0;
          for (let x = 0; x < blockSize; x++) {
            for (let y = 0; y < blockSize; y++) {
              const index = (y * blockSize + x) * 4 + c;
              const pixel = block[index];
              sum += pixel * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * blockSize)) * Math.cos(((2 * y + 1) * v * Math.PI) / (2 * blockSize));
            }
          }
          const index = (v * blockSize + u) * 4 + c;
          dctBlock[index] = sum * (u === 0 ? 1 / Math.sqrt(2) : 1) * (v === 0 ? 1 / Math.sqrt(2) : 1) / 4;
        }
      }
    }
    return dctBlock;
  }

  function applyIDCT(block, blockSize) {
    const idctBlock = new Array(blockSize * blockSize * 4).fill(0);
    for (let x = 0; x < blockSize; x++) {
      for (let y = 0; y < blockSize; y++) {
        for (let c = 0; c < 4; c++) { // Iterate over RGBA channels
          let sum = 0;
          for (let u = 0; u < blockSize; u++) {
            for (let v = 0; v < blockSize; v++) {
              const index = (v * blockSize + u) * 4 + c;
              const coeff = block[index];
              sum += coeff * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * blockSize)) * Math.cos(((2 * y + 1) * v * Math.PI) / (2 * blockSize)) * (u === 0 ? 1 / Math.sqrt(2) : 1) * (v === 0 ? 1 / Math.sqrt(2) : 1);
            }
          }
          const index = (y * blockSize + x) * 4 + c;
          idctBlock[index] = sum / 4;
        }
      }
    }
    return idctBlock;
  }

  function quantizeBlock(block, quality, blockSize) {
    const quantizedBlock = new Array(block.length);
    const quantizationMatrix = [
      16, 11, 10, 16, 24, 40, 51, 61,
      12, 12, 14, 19, 26, 58, 60, 55,
      14, 13, 16, 24, 40, 57, 69, 56,
      14, 17, 22, 29, 51, 87, 80, 62,
      18, 22, 37, 56, 68, 109, 103, 77,
      24, 35, 55, 64, 81, 104, 113, 92,
      49, 64, 78, 87, 103, 121, 120, 101,
      72, 92, 95, 98, 112, 100, 103, 99
    ];

    for (let i = 0; i < block.length; i++) {
      quantizedBlock[i] = Math.round(block[i] / (quantizationMatrix[i % 64] * quality));
    }
    return quantizedBlock;
  }

  function dequantizeBlock(block, quality, blockSize) {
    const dequantizedBlock = new Array(block.length);
    const quantizationMatrix = [
      16, 11, 10, 16, 24, 40, 51, 61,
      12, 12, 14, 19, 26, 58, 60, 55,
      14, 13, 16, 24, 40, 57, 69, 56,
      14, 17, 22, 29, 51, 87, 80, 62,
      18, 22, 37, 56, 68, 109, 103, 77,
      24, 35, 55, 64, 81, 104, 113, 92,
      49, 64, 78, 87, 103, 121, 120, 101,
      72, 92, 95, 98, 112, 100, 103, 99
    ];

    for (let i = 0; i < block.length; i++) {
      dequantizedBlock[i] = block[i] * (quantizationMatrix[i % 64] * quality);
    }
    return dequantizedBlock;
  }
});