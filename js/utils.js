export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function hashPassword(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds.
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
        
        console.log('--- COMPRESSION COMPLETE ---');
        console.log('Final image format:', format);
        console.log('Final base64 length:', dataUrl.length);
        
        resolve(dataUrl);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}

// ════════════════════════════════════════════════════════════════
// Photo URL Resolver — Works with Base64, local paths, and URLs
// ════════════════════════════════════════════════════════════════

/**
 * Resolve a photo value from the database into a valid image src.
 * Handles three formats:
 *   1. Base64:     "data:image/webp;base64,UklGR..."  → used as-is
 *   2. Local path: "photos/PGP-001.webp"              → resolved relative to app root
 *   3. URL:        "https://drive.google.com/..."      → used as-is
 *   4. Empty/null                                      → returns '' (no image)
 * 
 * @param {string} photoValue — the raw value from the student record
 * @returns {string} A valid src attribute for an <img> tag, or '' if empty
 */
export function resolvePhotoUrl(photoValue) {
  if (!photoValue || typeof photoValue !== 'string') return '';

  const trimmed = photoValue.trim();
  if (!trimmed) return '';

  // Case 1: Already a Base64 data URI — use as-is
  if (trimmed.startsWith('data:image')) {
    return trimmed;
  }

  // Case 2: A full URL (Google Drive, Cloudinary, etc.) — use as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Case 3: A local server path (e.g., "photos/PGP-001.webp")
  // Resolve relative to the app root
  if (trimmed.startsWith('photos/') || trimmed.startsWith('./photos/')) {
    return trimmed;
  }

  // Case 4: Unknown format — treat as a path anyway
  return trimmed;
}

/**
 * Check if a photo value represents a valid, displayable image.
 * @param {string} photoValue 
 * @returns {boolean}
 */
export function hasPhoto(photoValue) {
  return !!resolvePhotoUrl(photoValue);
}

/**
 * Upload a Base64 image to the local XAMPP server via the PHP endpoint.
 * Returns the relative file path (e.g., "photos/PGP-001.webp") on success.
 * Falls back to returning the original Base64 if the upload fails (offline mode).
 * 
 * @param {string} studentId — the student's PassID (used as filename)
 * @param {string} base64Data — the full data URI (data:image/webp;base64,...)
 * @returns {Promise<string>} The saved file path or the original Base64
 */
export async function uploadPhotoLocally(studentId, base64Data) {
  if (!base64Data || !studentId) return base64Data || '';

  try {
    const res = await fetch('./api/upload-photo.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, imageData: base64Data })
    });

    const json = await res.json();
    if (json.success && json.path) {
      console.log(`[PhotoUpload] Saved locally: ${json.path} (${json.size} bytes)`);
      return json.path;
    } else {
      console.warn('[PhotoUpload] Server rejected:', json.error);
      return base64Data; // Fallback to Base64
    }
  } catch (err) {
    console.warn('[PhotoUpload] Local upload failed (offline?), using Base64 fallback:', err.message);
    return base64Data; // Fallback to Base64 if server is unreachable
  }
}

// ════════════════════════════════════════════════════════════════
// PGP ID Generator — Format: {YY}{S}{GG}-{NNN}
// Example: 26A07-001 = Year 2026, Section starting with "A", Grade 7, student #001
// ════════════════════════════════════════════════════════════════

/**
 * Current school year prefix (first 2 digits of the starting year).
 * For SY 2026-2027, this is '26'.
 */
export const CURRENT_SCHOOL_YEAR = '26';

/**
 * Extract a 2-character grade code from a grade string.
 * "Grade 7" → "07", "Grade 10" → "10", "Grade 12" → "12"
 * "Pre-school" → "PS", "College" → "CO"
 * Unknown → "XX"
 */
export function gradeToCode(gradeStr) {
  if (!gradeStr) return 'XX';
  const trimmed = gradeStr.trim();

  // Match "Grade N" or "N" patterns
  const match = trimmed.match(/(\d+)/);
  if (match) {
    return match[1].padStart(2, '0'); // "7" → "07", "10" → "10"
  }

  // Special grade levels
  const lower = trimmed.toLowerCase();
  if (lower.includes('pre-school') || lower.includes('preschool') || lower.includes('kinder')) return 'PS';
  if (lower.includes('college')) return 'CO';

  return 'XX';
}

/**
 * Extract a section code letter from a section name.
 * Uses the first uppercase letter of the section name.
 * "Diligence" → "D", "Integrity" → "I", "" → "X"
 */
export function sectionToCode(sectionStr) {
  if (!sectionStr || typeof sectionStr !== 'string') return 'X';
  const trimmed = sectionStr.trim();
  if (!trimmed) return 'X';
  // Use first letter, uppercased
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Generate a unique PGP ID in the format: {YY}{S}{GG}-{NNN}
 * 
 * @param {string} grade - The grade level string (e.g., "Grade 7", "Grade 10")
 * @param {string} section - The section name (e.g., "Diligence", "A")
 * @param {Array} existingStudents - Array of existing student objects to check for duplicates
 * @param {string} [schoolYear] - Optional override for the year prefix (default: CURRENT_SCHOOL_YEAR)
 * @returns {string} A unique PGP ID like "26D07-001"
 */
export function generatePGP(grade, section, existingStudents, schoolYear) {
  const yy = schoolYear || CURRENT_SCHOOL_YEAR;
  const sCode = sectionToCode(section);
  const gCode = gradeToCode(grade);
  const prefix = `${yy}${sCode}${gCode}`; // e.g., "26A07"

  // Find the highest existing number for this prefix
  const existingNumbers = (existingStudents || [])
    .filter(s => s.pgp && s.pgp.startsWith(prefix + '-'))
    .map(s => {
      const parts = s.pgp.split('-');
      return parseInt(parts[1], 10);
    })
    .filter(n => !isNaN(n));

  const nextNumber = existingNumbers.length > 0
    ? Math.max(...existingNumbers) + 1
    : 1; // Start from 001

  if (nextNumber > 999) {
    throw new Error(`PGP capacity exceeded for prefix "${prefix}". Max 999 students per section per grade per year.`);
  }

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
  // Result: "26A07-001", "26A07-002", etc.
}
