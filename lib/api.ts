export async function searchQobuz(query: string, type: 'track' | 'artist' = 'track') {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`);

  if (!res.ok) {
    throw new Error(`Fehler beim Abrufen: ${res.status}`);
  }

  const data = await res.json();
  return data;
}

