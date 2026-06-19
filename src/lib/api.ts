export const AUTH_URL = 'https://functions.poehali.dev/60adcbc4-f1cd-4607-b146-8ced3ee137d7';
export const SETTINGS_URL = 'https://functions.poehali.dev/dca7c2b4-b639-40bd-98e8-6d0aa26ba013';

export async function authRequest(payload: Record<string, unknown>) {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, data: await res.json() };
}

export async function settingsRequest(payload: Record<string, unknown>, token?: string) {
  const res = await fetch(SETTINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Auth-Token': token } : {}),
    },
    body: JSON.stringify(payload),
  });
  return { status: res.status, data: await res.json() };
}

export async function fetchPublic() {
  const res = await fetch(SETTINGS_URL);
  return res.json();
}
