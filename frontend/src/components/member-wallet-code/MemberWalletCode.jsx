import styles from "./MemberWalletCode.module.css";

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213",
  "122312", "132212", "221213", "221312", "231212", "112232", "122132",
  "122231", "113222", "123122", "123221", "223211", "221132", "221231",
  "213212", "223112", "312131", "311222", "321122", "321221", "312212",
  "322112", "322211", "212123", "212321", "232121", "111323", "131123",
  "131321", "112313", "132113", "132311", "211313", "231113", "231311",
  "112133", "112331", "132131", "113123", "113321", "133121", "313121",
  "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111",
  "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114",
  "413111", "241112", "134111", "111242", "121142", "121241", "114212",
  "124112", "124211", "411212", "421112", "421211", "212141", "214121",
  "412121", "111143", "111341", "131141", "114113", "114311", "411113",
  "411311", "113141", "114131", "311141", "411131", "211412", "211214",
  "211232", "2331112"
];

const START_B = 104;
const STOP = 106;

function buildCode128BValues(value) {
  const text = String(value || "");
  const values = [START_B];
  let checksum = START_B;

  for (let index = 0; index < text.length; index += 1) {
    const charCode = text.charCodeAt(index);
    const codeValue = charCode - 32;

    if (codeValue < 0 || codeValue > 95) {
      throw new Error("Barcode value contains unsupported characters");
    }

    values.push(codeValue);
    checksum += codeValue * (index + 1);
  }

  values.push(checksum % 103);
  values.push(STOP);
  return values;
}

function BarcodeSvg({ value }) {
  let values = [];

  try {
    values = buildCode128BValues(value);
  } catch (error) {
    return null;
  }

  const moduleWidth = 2;
  const quietZone = 18;
  const height = 86;
  let x = quietZone;
  const bars = [];

  values.forEach((codeValue, valueIndex) => {
    const pattern = CODE128_PATTERNS[codeValue];
    let isBar = true;

    pattern.split("").forEach((widthChar, patternIndex) => {
      const width = Number(widthChar) * moduleWidth;
      if (isBar) {
        bars.push(
          <rect
            key={`${valueIndex}-${patternIndex}`}
            x={x}
            y="0"
            width={width}
            height={height}
          />
        );
      }
      x += width;
      isBar = !isBar;
    });
  });

  const width = x + quietZone;

  return (
    <svg
      className={styles.barcode}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Wallet balance lookup barcode"
    >
      <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
      <g fill="#0f172a">{bars}</g>
    </svg>
  );
}

export default function MemberWalletCode({ walletToken, label = "Wallet lookup code" }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const lookupUrl = walletToken ? `${origin}/wallet/${encodeURIComponent(walletToken)}` : "";

  if (!walletToken) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span>{label}</span>
        <strong>{walletToken}</strong>
      </div>
      <div className={styles.codeBox}>
        <BarcodeSvg value={lookupUrl} />
      </div>
      <p className={styles.lookupUrl}>{lookupUrl}</p>
    </div>
  );
}
