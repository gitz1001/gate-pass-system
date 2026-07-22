export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function compressImage(file, maxWidth = 250, maxHeight = 250, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        let format = 'image/webp';
        let dataUrl = canvas.toDataURL(format, quality);
        
        // If the browser doesn't support WebP encoding, it returns a PNG.
        if (dataUrl.startsWith('data:image/png')) {
          format = 'image/jpeg';
          // JPEG doesn't support transparency, so we add a white background
          ctx.globalCompositeOperation = "destination-over";
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.globalCompositeOperation = "source-over"; // reset
          dataUrl = canvas.toDataURL(format, quality);
        }
        
        // Compress further if the Base64 string is too large for Google Sheets (limit 50,000 chars)
        while (dataUrl.length > 45000 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL(format, quality);
        }

        // Failsafe: if it's STILL too big, cut dimensions in half
        if (dataUrl.length > 45000) {
          const failsafeCanvas = document.createElement('canvas');
          failsafeCanvas.width = width * 0.5;
          failsafeCanvas.height = height * 0.5;
          const fsCtx = failsafeCanvas.getContext('2d');
          if (format === 'image/jpeg') {
              fsCtx.fillStyle = "#FFFFFF";
              fsCtx.fillRect(0, 0, failsafeCanvas.width, failsafeCanvas.height);
          }
          fsCtx.drawImage(canvas, 0, 0, failsafeCanvas.width, failsafeCanvas.height);
          dataUrl = failsafeCanvas.toDataURL(format, 0.5);
        }
        
        resolve(dataUrl);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}
