export interface Lab {
  l: number;
  a: number;
  b: number;
}

const RAD = Math.PI / 180;
const POW25_7 = 25 ** 7;

function hueAngle(b: number, a: number): number {
  if (a === 0 && b === 0) return 0;
  const h = Math.atan2(b, a) / RAD;
  return h < 0 ? h + 360 : h;
}

/**
 * CIEDE2000 colour difference (kL = kC = kH = 1), following
 * Sharma, Wu & Dalal (2005), "The CIEDE2000 Color-Difference Formula".
 */
export function ciede2000(x: Lab, y: Lab): number {
  const c1 = Math.hypot(x.a, x.b);
  const c2 = Math.hypot(y.a, y.b);
  const cBar7 = ((c1 + c2) / 2) ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + POW25_7)));

  const a1 = (1 + g) * x.a;
  const a2 = (1 + g) * y.a;
  const c1p = Math.hypot(a1, x.b);
  const c2p = Math.hypot(a2, y.b);
  const h1p = hueAngle(x.b, a1);
  const h2p = hueAngle(y.b, a2);
  const chromaProduct = c1p * c2p;

  const dLp = y.l - x.l;
  const dCp = c2p - c1p;
  let dhp = 0;
  if (chromaProduct !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(chromaProduct) * Math.sin((dhp * RAD) / 2);

  const lBarP = (x.l + y.l) / 2;
  const cBarP = (c1p + c2p) / 2;
  let hBarP = h1p + h2p;
  if (chromaProduct !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hBarP = (h1p + h2p) / 2;
    else hBarP = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos((hBarP - 30) * RAD) +
    0.24 * Math.cos(2 * hBarP * RAD) +
    0.32 * Math.cos((3 * hBarP + 6) * RAD) -
    0.2 * Math.cos((4 * hBarP - 63) * RAD);
  const dTheta = 30 * Math.exp(-(((hBarP - 275) / 25) ** 2));
  const cBarP7 = cBarP ** 7;
  const rc = 2 * Math.sqrt(cBarP7 / (cBarP7 + POW25_7));
  const lMinus50Sq = (lBarP - 50) ** 2;
  const sl = 1 + (0.015 * lMinus50Sq) / Math.sqrt(20 + lMinus50Sq);
  const sc = 1 + 0.045 * cBarP;
  const sh = 1 + 0.015 * cBarP * t;
  const rt = -Math.sin(2 * dTheta * RAD) * rc;

  const lTerm = dLp / sl;
  const cTerm = dCp / sc;
  const hTerm = dHp / sh;
  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rt * cTerm * hTerm);
}
