import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const KEY = 'cryptsweeper.haptics.enabled';
let enabled = true;
try { enabled = localStorage.getItem(KEY) !== '0'; } catch { /* storage unavailable */ }

export function isHapticsEnabled() { return enabled; }
export function setHapticsEnabled(next) {
  enabled = Boolean(next);
  try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch { /* storage unavailable */ }
  return enabled;
}

export function haptic(kind) {
  if (!enabled || typeof window === 'undefined') return;
  let request;
  if (kind === 'dig' || kind === 'flag') request = Haptics.impact({ style: ImpactStyle.Light });
  else if (kind === 'damage') request = Haptics.impact({ style: ImpactStyle.Medium });
  else if (kind === 'mine') request = Haptics.impact({ style: ImpactStyle.Heavy });
  else if (kind === 'victory') request = Haptics.notification({ type: NotificationType.Success });
  else if (kind === 'invalid') request = Haptics.notification({ type: NotificationType.Warning });
  request?.catch(() => {}); // web and unsupported devices remain silent
}
