async function request(path, { method = 'GET', body, hostKey } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (hostKey) headers['x-host-key'] = hostKey;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  createRoom: (name) => request('/rooms', { method: 'POST', body: { name } }),
  getRoom: (code) => request(`/rooms/${code}`),
  listQuestions: (code, hostKey) => request(`/rooms/${code}/questions`, { hostKey }),
  createQuestion: (code, hostKey, body) =>
    request(`/rooms/${code}/questions`, { method: 'POST', body, hostKey }),
  updateQuestion: (code, hostKey, id, body) =>
    request(`/rooms/${code}/questions/${id}`, { method: 'PUT', body, hostKey }),
  deleteQuestion: (code, hostKey, id) =>
    request(`/rooms/${code}/questions/${id}`, { method: 'DELETE', hostKey }),
};

api.getResults = (code, hostKey, id) => request(`/rooms/${code}/questions/${id}/results`, { hostKey });
