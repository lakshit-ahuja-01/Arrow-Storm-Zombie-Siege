/**
 * Mobile Controls Management
 * Provides configurable Jump Button placement (Left vs Right side)
 * with Right side as the default for mobile touchscreen gameplay.
 */

export type JumpButtonPosition = 'left' | 'right';

const STORAGE_KEY = 'ragdoll_jump_button_pos';

/**
 * Returns current jump button position preference. Default is 'right'.
 */
export function getJumpButtonPosition(): JumpButtonPosition {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'left' || saved === 'right') {
      return saved;
    }
  } catch {}
  return 'right';
}

/**
 * Saves and applies jump button placement preference.
 */
export function setJumpButtonPosition(pos: JumpButtonPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY, pos);
  } catch {}
  applyJumpButtonPosition(pos);
}

/**
 * Applies CSS classes and UI toggle state for jump button placement.
 */
export function applyJumpButtonPosition(pos?: JumpButtonPosition): void {
  const position = pos ?? getJumpButtonPosition();
  const isRight = position === 'right';

  // Toggle body classes
  document.body.classList.toggle('jump-pos-right', isRight);
  document.body.classList.toggle('jump-pos-left', !isRight);
  document.documentElement.classList.toggle('jump-pos-right', isRight);
  document.documentElement.classList.toggle('jump-pos-left', !isRight);

  // Update Tutorial selector if present
  const tutLeft = document.getElementById('btn-tutorial-jump-left');
  const tutRight = document.getElementById('btn-tutorial-jump-right');
  const tutLabel = document.getElementById('tutorial-jump-heading');

  if (tutLeft) tutLeft.classList.toggle('active', !isRight);
  if (tutRight) tutRight.classList.toggle('active', isRight);
  if (tutLabel) {
    tutLabel.textContent = isRight ? '🦘 TAP [JUMP] (BOTTOM-RIGHT)' : '🦘 TAP [JUMP] (BOTTOM-LEFT)';
  }

  // Update Pause Menu selector if present
  const pauseLeft = document.getElementById('btn-pause-jump-left');
  const pauseRight = document.getElementById('btn-pause-jump-right');
  if (pauseLeft) pauseLeft.classList.toggle('active', !isRight);
  if (pauseRight) pauseRight.classList.toggle('active', isRight);
}

/**
 * Binds click/touch handlers to Jump placement toggle buttons.
 */
export function initMobileControlsUI(): void {
  // Apply saved or default ('right') placement
  applyJumpButtonPosition();

  const bindToggle = (btnId: string, pos: JumpButtonPosition) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      const handler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        setJumpButtonPosition(pos);
      };
      btn.addEventListener('click', handler);
      btn.addEventListener('touchstart', handler, { passive: false });
    }
  };

  // Tutorial buttons
  bindToggle('btn-tutorial-jump-left', 'left');
  bindToggle('btn-tutorial-jump-right', 'right');

  // Pause menu buttons
  bindToggle('btn-pause-jump-left', 'left');
  bindToggle('btn-pause-jump-right', 'right');
}
