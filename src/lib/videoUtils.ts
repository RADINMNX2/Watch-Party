const playPromises = new WeakMap<HTMLVideoElement, Promise<void>>();

/**
 * Safely requests playback on an HTMLVideoElement while gracefully handling
 * browser autoplay policies and play/pause promise interruptions (AbortError).
 */
export async function safePlay(
  vid: HTMLVideoElement,
  onAutoplayBlocked?: () => void
): Promise<boolean> {
  if (!vid) return false;
  try {
    const promise = vid.play();
    if (promise !== undefined) {
      playPromises.set(vid, promise);
      await promise;
    }
    return true;
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      onAutoplayBlocked?.();
    }
    // AbortError / interrupted by pause is expected browser behavior - swallow cleanly without logging
    return false;
  } finally {
    playPromises.delete(vid);
  }
}

/**
 * Safely pauses an HTMLVideoElement after waiting for any in-flight play request
 * to resolve, preventing DOMException: The play() request was interrupted by a call to pause().
 */
export async function safePause(vid: HTMLVideoElement): Promise<void> {
  if (!vid) return;
  const existingPromise = playPromises.get(vid);
  if (existingPromise) {
    try {
      await existingPromise;
    } catch {
      // Ignore play promise rejection
    }
  }
  try {
    if (!vid.paused) {
      vid.pause();
    }
  } catch {
    // Ignore pause error
  }
}
