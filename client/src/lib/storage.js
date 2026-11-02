// Storage can throw (private mode, blocked cookies) — never let that break the app
function safe(store) {
  return {
    get(key) {
      try {
        return store().getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        store().setItem(key, value);
      } catch {
        /* ignore */
      }
    },
  };
}

const local = safe(() => window.localStorage);
const session = safe(() => window.sessionStorage);

export const getHostKey = (code) => local.get(`hostKey:${code}`);
export const setHostKey = (code, key) => local.set(`hostKey:${code}`, key);

// Per tab: refresh keeps identity, separate tabs are separate students
export function getParticipantId() {
  let id = session.get('participantId');
  if (!id) {
    id = crypto.randomUUID();
    session.set('participantId', id);
  }
  return id;
}
export const getNickname = (code) => session.get(`nickname:${code}`);
export const setNickname = (code, nick) => session.set(`nickname:${code}`, nick);
