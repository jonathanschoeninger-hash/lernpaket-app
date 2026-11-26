// Hash-Adressen der App (DESIGN.md 10, Punkt 6) – mit / getrennt, Teile URL-kodiert.
// Optionaler Filter: "#/paket/<id>/ueben/<unterthema>?nur=fehler"

const UNTERSEITEN = ['zusammenfassung', 'karten', 'ueben', 'fehlerheft'];
const FILTER = ['fehler'];

/** "#/paket/<id>/karten/<unterthema>" → { seite, paketId, unterthema, nur? } */
export function leseRoute(hash) {
  const [pfad, abfrage = ''] = String(hash || '').split('?');
  let teile;
  try {
    teile = pfad
      .replace(/^#\/?/, '')
      .split('/')
      .filter((t) => t !== '')
      .map((t) => decodeURIComponent(t));
  } catch {
    return { seite: 'start' };
  }

  if (teile[0] !== 'paket' || !teile[1]) return { seite: 'start' };
  const paketId = teile[1];
  if (!teile[2] || !UNTERSEITEN.includes(teile[2])) return { seite: 'paket', paketId };

  const route = { seite: teile[2], paketId, unterthema: teile[3] ?? null };
  const nur = new URLSearchParams(abfrage).get('nur');
  if (FILTER.includes(nur)) route.nur = nur;
  return route;
}

export function baueRoute(seite, paketId, unterthema, { nur } = {}) {
  if (seite === 'start' || !paketId) return '#/start';
  const teile = ['#', 'paket', encodeURIComponent(paketId)];
  if (seite !== 'paket') teile.push(seite);
  if (seite !== 'paket' && unterthema) teile.push(encodeURIComponent(unterthema));
  return teile.join('/') + (nur ? `?nur=${encodeURIComponent(nur)}` : '');
}
