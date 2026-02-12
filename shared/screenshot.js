// Screenshot generation for celebration sharing
// Overlays dynamic text on a static background image

async function generateCelebrationScreenshot(chapterName, chapters, halachot, timelapse, days) {
  try {
    // Load the static background image from ImgBB (CORS-enabled)
    const bgImage = new Image();
    bgImage.crossOrigin = 'anonymous'; // Enable CORS

    await new Promise((resolve) => {
      bgImage.onload = resolve;
      bgImage.onerror = () => {
        bgImage.src = 'https://i.ibb.co/ds16VmN9/celebration-bg.png';
      };
      bgImage.src = './assets/celebration-bg.png';
    });

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = bgImage.width;
    canvas.height = bgImage.height;
    const ctx = canvas.getContext('2d');

    // Draw background image
    ctx.drawImage(bgImage, 0, 0);

    // Wait for fonts to load
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Set text properties for Hebrew RTL
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc107'; // Gold color for numbers

    // Draw the chapterName to the app
    ctx.font = '700 80px "Noto Sans Hebrew", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(chapterName.toString(), 540, 520);

    // Draw the 3 stats numbers (RTL order: chapters, halachot, timelapse)
    const statsY = 710;
    const statsX = [785, 535, 285];

    ctx.font = '400 50px "Noto Sans Hebrew", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(chapters.toString(), statsX[0], statsY);
    ctx.fillText(halachot.toString(), statsX[1], statsY);
    ctx.fillText(timelapse.toString(), statsX[2], statsY);

    // Draw only the number of days (text is already in background)
    ctx.font = '700 30px "Noto Sans Hebrew", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fddd7f';
    ctx.fillText(days.toString(), 795, 930);

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
    });
  } catch (err) {
    console.error('Failed to generate screenshot:', err);
    return null;
  }
}

// Export for use in core.js
window.generateCelebrationScreenshot = generateCelebrationScreenshot;
