export function getPlaybackVisualState(isPaused) {
  return {
    buttonLabel: isPaused ? "Play" : "Pause",
    isAnimating: !isPaused,
  };
}

export function getVisualizerBarCount(width, pixelsPerBar = 9, minimumBars = 12) {
  if (!Number.isFinite(width) || width <= 0) {
    return minimumBars;
  }

  return Math.max(minimumBars, Math.floor(width / pixelsPerBar));
}

export function createVisualizerLevels(
  samples,
  barCount,
  minimumLevel = 0.14,
  dynamicRange = 0.9,
  frequencySkew = 0.72,
  responseCurve = 0.66,
) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return Array.from({ length: barCount }, () => minimumLevel);
  }

  const halfCount = Math.ceil(barCount / 2);
  const halfProfile = Array.from({ length: halfCount }, (_, index) => {
    const ratio = halfCount === 1 ? 0 : index / (halfCount - 1);
    const sampleIndex = Math.min(
      samples.length - 1,
      Math.round((ratio ** frequencySkew) * (samples.length - 1)),
    );
    const energy = (samples[sampleIndex] / 255) ** responseCurve;
    const normalized = Math.min(
      1,
      minimumLevel + energy * dynamicRange,
    );

    return Number(normalized.toFixed(2));
  });

  if (barCount % 2 === 0) {
    return smoothMirroredLevels(
      [...halfProfile.slice().reverse(), ...halfProfile],
      minimumLevel,
    );
  }

  return smoothMirroredLevels(
    [...halfProfile.slice(1).reverse(), ...halfProfile],
    minimumLevel,
  );
}

function smoothMirroredLevels(levels, minimumLevel) {
  return levels.map((level, index) => {
    const previous = levels[index - 1] ?? minimumLevel;
    const next = levels[index + 1] ?? minimumLevel;
    const smoothed = previous * 0.2 + level * 0.6 + next * 0.2;

    return Number(smoothed.toFixed(2));
  });
}
