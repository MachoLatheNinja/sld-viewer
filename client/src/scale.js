export function createMeterScale(startM, pxPerM) {
  const cssLeftFromM = (m) => (m - startM) * pxPerM;
  const strokeXFromM = (m) => Math.round(cssLeftFromM(m)) + 0.5;
  const rectPx = (m1, m2) => {
    const x1 = Math.round(cssLeftFromM(m1));
    const x2 = Math.round(cssLeftFromM(m2));
    return { x: x1, w: x2 - x1 };
  };
  return { startM, pxPerM, cssLeftFromM, strokeXFromM, rectPx };
}
