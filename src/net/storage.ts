const LAST_NICKNAME_KEY = 'lastNickname';
const LAST_ROOM_CODE_KEY = 'lastRoomCode';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private-mode storage failures are non-fatal.
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function getLastNickname(): string {
  return safeGet(LAST_NICKNAME_KEY) ?? '';
}

export function setLastNickname(nickname: string): void {
  safeSet(LAST_NICKNAME_KEY, nickname);
}

export function getLastRoomCode(): string | null {
  return safeGet(LAST_ROOM_CODE_KEY);
}

export function setLastRoomCode(code: string): void {
  safeSet(LAST_ROOM_CODE_KEY, code);
}

export function clearLastRoomCode(): void {
  safeRemove(LAST_ROOM_CODE_KEY);
}
