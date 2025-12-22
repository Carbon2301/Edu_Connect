/**
 * Utility functions for file handling
 */

/**
 * Extract original filename from URL by removing timestamp suffix
 * Example: "anh1-1234567890-987654321.png" => "anh1.png"
 */
export function getOriginalFileName(fileUrl: string): string {
  // Get filename from URL
  const filename = fileUrl.split('/').pop() || fileUrl;
  
  // Pattern: originalname-timestamp-random.ext
  // Remove the last two parts (timestamp and random number)
  const match = filename.match(/^(.+?)-\d+-\d+(\.\w+)$/);
  
  if (match) {
    // Return originalname + extension
    return match[1] + match[2];
  }
  
  // Fallback: return filename as is
  return filename;
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

