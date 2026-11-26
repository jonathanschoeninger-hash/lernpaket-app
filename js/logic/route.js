// Hash-Adressen der App (DESIGN.md 10, Punkt 6) – mit / getrennt, Teile URL-kodiert.

const UNTERSEITEN = ['zusammenfassung', 'karten'];

/** "#/paket/<id>/karten/<unterthema>" → { seite, paketId, unterthema } */
export function leseRoute(hash) {
  let teile;
  try {
    teile = String(hash || '')
      .replace(/^#\/?/, '')
      .split('/')
      .filter((t) => t !== '')
      .map((t) => decodeURIComponent(t));
  } catch {
    return { seite: 'start' };
  }

  if (teile[0] !== 'paket' || !teile[1]) return { seite: 'start' };
  const paketId = teile[1];
  if (!teile[2]) return { seite: 'paket', paketId };
  if (!UNTERSEITEN.includes(teile[2])) return { seite: 'paket', paketId };
  return { seite: teile[2], paketId, unterthema: teile[3] ?? null };
}

export function baueRoute(seite, paketId, unterthema) {
  if (seite === 'start' || !paketId) return '#/start';
  const teile = ['#', 'paket', encodeURIComponent(paketId)];
  if (seite !== 'paket') teile.push(seite);
  if (seite !== 'paket' && unterthema) teile.push(encodeURIComponent(unterthema));
  return teile.join('/');
}
