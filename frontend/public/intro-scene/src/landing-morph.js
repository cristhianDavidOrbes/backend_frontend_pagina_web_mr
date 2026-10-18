/**
 * The last shot assembles the captured, real AlgoLab homepage.
 * Interface crops retain their real coordinates; the mascot stays live in 3D.
 */
const WIDTH = 1920;
const HEIGHT = 1080;
const clamp = value => Math.min(1, Math.max(0, value));
const smooth = value => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};
const progress = (time, start, end) => smooth((time - start) / (end - start));
const lerp = (a, b, amount) => a + (b - a) * amount;

function canvas(width, height) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  return element;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar la landing real: ${url}`));
    image.src = url;
  });
}

// Remove only the connected, empty green backdrop around a crop. Dark details
// inside the robot and the rounded nav/buttons remain behind their outlines.
function isolateBackdrop(context, width, height) {
  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    if (r < 32 && g < 55 && b < 48 && g > r + 4 && g >= b) {
      queue[tail++] = index;
    }
  }
  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  while (head < tail) {
    const index = queue[head++];
    data[index * 4 + 3] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }
  context.putImageData(pixels, 0, 0);
}

export async function createLandingMorph() {
  const image = await loadImage(new URL('../assets/landing-real.png', import.meta.url).href);
  const screenshot = canvas(WIDTH, HEIGHT);
  const source = screenshot.getContext('2d', { willReadFrequently: true });
  source.drawImage(image, 0, 0, WIDTH, HEIGHT);

  // Separate title lines produce a single flowing unfold from the code panel.
  // Preserve the real speech bubble, but never replace the protagonist with a photo.
  const definitions = [
    { key: 'brand', rect: [412, 4, 1096, 84], start: 18.05, end: 19.30, scale: .16, angle: -.12, arc: -160 },
    { key: 'robot', speech: true, rect: [675, 305, 245, 125], start: 18.35, end: 19.40, scale: .62, angle: -.06, arc: -50 },
    { key: 'door', rect: [952, 276, 238, 46], start: 18.36, end: 19.36, scale: .48, angle: -.13, arc: -95 },
    { key: 'code', rect: [952, 330, 620, 102], start: 17.64, end: 19.12, scale: .32, angle: .10, arc: -115 },
    { key: 'code', rect: [952, 432, 620, 99], start: 17.76, end: 19.24, scale: .32, angle: .08, arc: -90 },
    { key: 'code', rect: [952, 531, 620, 91], start: 17.88, end: 19.36, scale: .32, angle: .06, arc: -65 },
    { key: 'code', rect: [952, 630, 620, 112], start: 18.13, end: 19.45, scale: .45, angle: .04, arc: -40 },
    { key: 'book', rect: [940, 750, 278, 114], start: 18.30, end: 19.55, scale: .38, angle: -.14, arc: 75 },
    { key: 'book', rect: [1218, 750, 240, 114], start: 18.44, end: 19.68, scale: .38, angle: .14, arc: 110 },
  ];
  const pieces = definitions.map(definition => {
    const [x, y, width, height] = definition.rect;
    const texture = canvas(width, height);
    const context = texture.getContext('2d', { willReadFrequently: true });
    context.drawImage(screenshot, x, y, width, height, 0, 0, width, height);
    if(definition.speech){
      context.globalCompositeOperation='destination-in';context.beginPath();context.roundRect(9,9,220,97,20);context.moveTo(27,103);context.lineTo(41,117);context.lineTo(54,103);context.closePath();context.fill();context.globalCompositeOperation='source-over';
      // The original head overlaps a few pixels at the bubble's lower left.
      context.clearRect(0,66,18,59);
    }
    isolateBackdrop(context, width, height);
    return { ...definition, texture, pivot: definition.pivot || [width / 2, height / 2] };
  });

  // Reconstruct only the empty background from the image's clear margins.
  // The slight teal lighting stays faithful to the captured landing instead of
  // becoming a flat, unrelated black end card.
  const background = canvas(WIDTH, HEIGHT);
  const backgroundContext = background.getContext('2d');
  const scan = source.getImageData(0, 0, WIDTH, HEIGHT).data;
  for (let y = 0; y < HEIGHT; y++) {
    const left = (y * WIDTH + 260) * 4;
    const right = (y * WIDTH + 1770) * 4;
    const gradient = backgroundContext.createLinearGradient(260, 0, 1770, 0);
    gradient.addColorStop(0, `rgb(${scan[left]},${scan[left + 1]},${scan[left + 2]})`);
    gradient.addColorStop(1, `rgb(${scan[right]},${scan[right + 1]},${scan[right + 2]})`);
    backgroundContext.fillStyle = gradient;
    backgroundContext.fillRect(0, y, WIDTH, 1);
  }

  // Remove the screenshot's mascot and shadow. The same animated GLB is drawn
  // in its place by the film's transparent foreground pass.
  source.drawImage(background,510,326,260,480,510,326,260,480);
  const speech=pieces.find(piece=>piece.speech);
  source.drawImage(speech.texture,speech.rect[0],speech.rect[1]);

  const defaults = {
    robot: [650, 600],
    code: [1120, 530],
    book: [920, 740],
    brand: [850, 450],
    door: [450, 570],
  };
  const pointFor = (anchors, key) => {
    const point = anchors[key] || defaults[key];
    return point && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) ? point : defaults[key];
  };

  function draw(context, time, anchors = {}) {
    if (time <= 17.2) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);

    if (time >= 19.95) {
      context.drawImage(screenshot, 0, 0);
      context.restore();
      return;
    }

    const backdrop = progress(time, 17.2, 19.08);
    context.globalAlpha = backdrop;
    context.drawImage(background, 0, 0);
    context.globalAlpha = 1;

    for (const piece of pieces) {
      if (time < piece.start) continue;
      const raw = clamp((time - piece.start) / (piece.end - piece.start));
      const p = smooth(raw);
      const [sx, sy, width, height] = piece.rect;
      const [px, py] = piece.pivot;
      const origin = pointFor(anchors, piece.key);
      const target = [sx + px, sy + py];
      const arch = Math.sin(Math.PI * p) * piece.arc;
      const x = lerp(origin[0], target[0], p);
      const y = lerp(origin[1], target[1], p) + arch;
      const scale = lerp(piece.scale, 1, p);
      const tilt = piece.angle * (1 - p);
      const opacity = smooth(raw / .24);

      // A short residual trace ties each real object to its new interface role.
      // It disappears before the completed landing; no arbitrary extra objects.
      const trace = Math.sin(Math.PI * raw) * .20;
      if (trace > .001) {
        context.save();
        context.globalAlpha = trace;
        context.strokeStyle = piece.key === 'book' ? '#f4cf79' : '#55ddbb';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(origin[0], origin[1]);
        context.quadraticCurveTo((origin[0] + x) / 2, Math.min(origin[1], y) - 30, x, y);
        context.stroke();
        context.restore();
      }

      context.save();
      context.globalAlpha = opacity;
      context.translate(x, y);
      context.rotate(tilt);
      // Slight foreshortening reads as a tangible panel turning toward camera.
      context.scale(scale * (.82 + .18 * p), scale);
      context.shadowColor = `rgba(0,0,0,${.24 * (1 - p)})`;
      context.shadowBlur = 28 * (1 - p);
      context.shadowOffsetY = 18 * (1 - p);
      context.drawImage(piece.texture, -px, -py, width, height);
      context.restore();
    }

    // Restore the native interface pixels around the persistent live mascot.
    const settle = progress(time, 19.70, 19.95);
    if (settle > 0) {
      context.globalAlpha = settle;
      context.drawImage(screenshot, 0, 0);
    }
    context.restore();
  }

  return { draw, ready: true, liveMascot: true };
}
