import { crazyGames } from '../systems/CrazyGamesSDK';

/**
 * Robust device detection that accurately identifies mobile/tablet devices
 * across all environments:
 * 1. CrazyGames embedded iframe (SDK systemInfo.device.type === 'mobile' | 'tablet')
 * 2. Standalone mobile browsers (iOS Safari, Android Chrome)
 * 3. Mobile landscape mode (e.g. 800x450, 844x390, 896x414)
 * 4. Touchscreen devices with coarse pointer
 */
export function isMobileDevice(): boolean {
  // 1. Check CrazyGames SDK device detection if available
  if (crazyGames.isMobile()) {
    return true;
  }

  // 2. Mobile User Agent regex check
  const ua = navigator.userAgent || (navigator as any).vendor || (window as any).opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua);
  if (isMobileUA) {
    return true;
  }

  // 3. Hardware touch capability
  const hasTouch = (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );

  // 4. Coarse pointer media query (standard for touchscreens without precision mouse)
  const isCoarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const noHover = typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;

  if (hasTouch && (isCoarse || noHover)) {
    return true;
  }

  // 5. Dimensions check (e.g. CrazyGames mobile iframe 800x450 with touch capability, or small screen)
  const w = window.innerWidth || document.documentElement.clientWidth || 1200;
  const h = window.innerHeight || document.documentElement.clientHeight || 675;

  if (hasTouch && (w <= 1024 || h <= 550)) {
    return true;
  }

  if (w <= 640) {
    return true;
  }

  return false;
}

export function isPortraitMode(): boolean {
  const w = window.innerWidth || document.documentElement.clientWidth || 0;
  const h = window.innerHeight || document.documentElement.clientHeight || 0;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(orientation: portrait)').matches) {
    return true;
  }
  return h > w;
}

export function isLandscapeMode(): boolean {
  return !isPortraitMode();
}

/**
 * Returns true if running in YouTube Playables environment (SDK, test suite, or iframe).
 * YouTube Playables certification mandates NO ORIENTATION LOCKING (games must never block portrait).
 */
export function isYouTubePlayables(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).ytgame ||
    (window as any).IN_PLAYABLES_ENV ||
    (document.referrer && document.referrer.includes('youtube')) ||
    (window.location && (window.location.search.includes('youtube') || window.location.pathname.includes('yt-test-suite'))) ||
    (window.self !== window.top && (window as any).ytgame)
  );
}

let userDismissedPortraitPrompt = false;

export function dismissPortraitPrompt(): void {
  userDismissedPortraitPrompt = true;
  const overlay = document.getElementById('orientation-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

/**
 * Attempts to lock screen orientation to landscape using modern ScreenOrientation API.
 */
export async function requestLandscapeOrientation(): Promise<void> {
  // Do not attempt orientation lock in YouTube Playables (violates certification policy)
  if (isYouTubePlayables()) return;

  try {
    const orientation = (screen as any).orientation;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape').catch(() => {});
    }
  } catch {}
}

/**
 * Synchronizes `.is-mobile`, `.is-portrait`, and `.is-landscape` classes
 * and manages `#orientation-overlay` visibility.
 */
export function syncMobileMode(): boolean {
  const mobile = isMobileDevice();
  const portrait = mobile && isPortraitMode();

  if (mobile) {
    document.body.classList.add('is-mobile');
    document.documentElement.classList.add('is-mobile');
  } else {
    document.body.classList.remove('is-mobile');
    document.documentElement.classList.remove('is-mobile');
  }

  const overlay = document.getElementById('orientation-overlay');
  const suppressOverlay = isYouTubePlayables() || userDismissedPortraitPrompt;

  if (overlay) {
    if (portrait && !suppressOverlay) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }

  if (portrait) {
    document.body.classList.add('is-portrait');
    document.body.classList.remove('is-landscape');
  } else {
    document.body.classList.remove('is-portrait');
    if (mobile) {
      document.body.classList.add('is-landscape');
    } else {
      document.body.classList.remove('is-landscape');
    }
  }

  return mobile;
}
