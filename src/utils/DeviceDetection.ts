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

/**
 * Synchronizes `.is-mobile` class on document.body and document.documentElement.
 */
export function syncMobileMode(): boolean {
  const mobile = isMobileDevice();
  if (mobile) {
    document.body.classList.add('is-mobile');
    document.documentElement.classList.add('is-mobile');
  } else {
    document.body.classList.remove('is-mobile');
    document.documentElement.classList.remove('is-mobile');
  }
  return mobile;
}
