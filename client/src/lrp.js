export function parseLrpKm(lrp) {
  const s = (lrp || '').replace(/\s+/g, '').toUpperCase();
  const m = /^K?M?(\d+)(?:\+(\d+))?$/.exec(s);
  if (!m) return null;
  const km = Number(m[1]);
  const meters = m[2] ? Number(m[2]) : 0;
  return km + meters / 1000;
}

export function lrpToChainageKm(lrp, posts = []) {
  const kmVal = parseLrpKm(lrp);
  if (kmVal == null) return null;
  if (!posts.length) return kmVal;
  const sorted = posts.slice().sort((a, b) => a.chainageKm - b.chainageKm);
  const first = sorted[0];
  const baseKm = parseLrpKm(first?.lrp);
  if (baseKm == null) return kmVal;
  const offset = first.chainageKm - baseKm;
  return kmVal + offset;
}
