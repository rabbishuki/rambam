// Screenshot generation for celebration sharing
// Overlays dynamic text on a static background image

async function generateCelebrationScreenshot(days, halakhot, chapters, url) {
  try {
    // Load the static background image from local assets
    const bgImage = new Image();

    await new Promise((resolve, reject) => {
      bgImage.onload = resolve;
      bgImage.onerror = () => reject(new Error('Failed to load background image'));
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

    // Draw the 3 stats numbers (RTL order: days, chapters, halakhot)
    const statsY = 500;
    const statsX = [785, 535, 285]; // RTL order: days, chapters, halakhot

    ctx.font = '700 50px "Noto Sans Hebrew", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(days.toString(), statsX[0], statsY);
    ctx.fillText(chapters.toString(), statsX[1], statsY);
    ctx.fillText(halakhot.toString(), statsX[2], statsY);

    // Draw only the number of days (text is already in background)
    ctx.font = '700 30px "Noto Sans Hebrew", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fddd7f';
    ctx.fillText(days.toString(), 795, 976);

    // Draw the url to the app
    ctx.font = '700 36px "Noto Sans Hebrew", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffc107';
    ctx.fillText(url.toString(), 550, 1450);

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
