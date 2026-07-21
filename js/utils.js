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
        
        let dataUrl = canvas.toDataURL('image/webp', quality);
        
        // Compress further if the Base64 string is too large for Google Sheets (limit 50,000)
        while (dataUrl.length > 45000 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/webp', quality);
        }
        
        resolve(dataUrl);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}
