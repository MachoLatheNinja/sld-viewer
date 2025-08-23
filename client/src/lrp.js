export function parseLrpKm(lrp) {
  const s = (lrp || '').replace(/\s+/g, '').toUpperCase();
  const m = /^K?M?(\d+)(?:\+(\d+))?$/.exec(s);
  if (!m) return null;
  const km = Number(m[1]);
  const meters = m[2] ? Number(m[2]) : 0;
  return km + meters / 1000;
}
