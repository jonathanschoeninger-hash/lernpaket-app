// DOM-Helfer. Paketinhalt kommt NUR als Text in die Seite (textContent / Textknoten),
// niemals über innerHTML.

/**
 * Element bauen: el('p', { class: 'x', on: { click: fn } }, 'Text', kindElement, …)
 * Strings werden zu Textknoten, null/false werden übersprungen, Listen werden flach gemacht.
 */
export function el(tag, eigenschaften = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [name, wert] of Object.entries(eigenschaften ?? {})) {
    if (wert === null || wert === undefined || wert === false) continue;
    if (name === 'on') {
      for (const [ereignis, fn] of Object.entries(wert)) e.addEventListener(ereignis, fn);
    } else if (name === 'class') {
      e.className = wert;
    } else if (name === 'text') {
      e.textContent = wert;
    } else if (name in e && typeof wert !== 'string') {
      e[name] = wert; // z. B. disabled, checked, hidden
    } else {
      e.setAttribute(name, wert === true ? '' : String(wert));
    }
  }
  anhaengen(e, kinder);
  return e;
}

function anhaengen(eltern, kinder) {
  for (const kind of kinder.flat(Infinity)) {
    if (kind === null || kind === undefined || kind === false) continue;
    eltern.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
}

export function leeren(e) {
  e.replaceChildren();
  return e;
}

/** Kurze Meldung für Screenreader (und sichtbar als kleine Einblendung). */
export function ansage(text) {
  const region = document.getElementById('ansage');
  if (!region) return;
  region.textContent = '';
  // Kurze Verzögerung, damit gleiche Texte erneut vorgelesen werden.
  setTimeout(() => {
    region.textContent = text;
  }, 30);
  clearTimeout(ansage.timer);
  ansage.timer = setTimeout(() => {
    region.textContent = '';
  }, 4000);
}

/**
 * Eigener Dialog statt confirm(): frageDialog({ titel, text, knoepfe: [{ text, wert, art }] })
 * → Promise mit dem `wert` des gewählten Knopfs, oder null bei Escape.
 */
export function frageDialog({ titel, text, knoepfe }) {
  return new Promise((resolve) => {
    const titelId = `dialog-titel-${Date.now()}`;
    const dialog = el(
      'dialog',
      { class: 'dialog', 'aria-labelledby': titelId },
      el('h2', { id: titelId, text: titel }),
      [text].flat().map((absatz) => el('p', { text: absatz })),
      el(
        'div',
        { class: 'dialog-knoepfe' },
        knoepfe.map((k) =>
          el('button', {
            type: 'button',
            class: k.art === 'gefahr' ? 'knopf gefahr' : k.art === 'haupt' ? 'knopf haupt' : 'knopf',
            text: k.text,
            on: { click: () => dialog.close(String(knoepfe.indexOf(k))) },
          }),
        ),
      ),
    );
    dialog.addEventListener('close', () => {
      const index = Number.parseInt(dialog.returnValue, 10);
      dialog.remove();
      resolve(Number.isInteger(index) ? knoepfe[index].wert : null);
    });
    document.body.append(dialog);
    dialog.returnValue = '';
    dialog.showModal();
    // Fokus auf den ungefährlichen ersten Knopf.
    dialog.querySelector('button')?.focus();
  });
}

/** Text als Datei herunterladen (Blob-Link, keine Netzwerkanfrage). */
export function herunterladen(dateiname, inhalt, typ = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = el('a', { href: url, download: dateiname, hidden: true });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Knopf, den es noch nicht gibt: deaktiviert, mit sichtbarem Hinweis. */
export function kommtBald(beschriftung) {
  return el(
    'span',
    { class: 'kommt-bald' },
    el('button', { type: 'button', class: 'knopf', disabled: true, text: beschriftung }),
    el('small', { text: 'kommt in einer späteren Version' }),
  );
}
