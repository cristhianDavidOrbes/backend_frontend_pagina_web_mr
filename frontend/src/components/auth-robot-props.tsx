import type { ReactNode } from "react";
import styles from "./auth-robot-props.module.css";

export type RobotPropKind =
  | "book"
  | "books"
  | "plant"
  | "crate"
  | "gear"
  | "code"
  | "car"
  | "lamp"
  | "ball"
  | "trophy"
  | "rocket"
  | "picture";

export type RobotEffectKind = "impact" | "stars" | "dust" | "sparkles";

const cream = "#f4e7bd";
const mint = "#58dab3";
const teal = "#218f91";
const ink = "#173e3e";
const gold = "#e8bd55";

function Book({ color = mint }: { color?: string }) {
  return (
    <>
      <path d="M26 51 110 28 143 44 62 69Z" fill={ink} />
      <path d="m28 54 33 17 80-23v28L61 101 28 83Z" fill={cream} />
      <path d="m28 54 33 17v30L28 83Z" fill={color} />
      <path d="m61 71 80-23v5L61 76Zm0 17 80-23v3L61 91Z" fill="#cfbf96" />
      <path d="m25 79 36 19 83-26v9L61 108 25 88Z" fill={ink} />
      <path d="m35 60 5 3v25l-5-3Zm12 6 4 2v24l-4-2Z" fill={gold} />
      <path d="m50 49 59-16 19 9-60 18Z" fill="#254e4a" />
      <path d="m81 44 24-7 8 4-24 7Z" fill={gold} />
    </>
  );
}

function CarArtwork({ moving = false }: { moving?: boolean }) {
  return (
    <>
      <ellipse cx="124" cy="124" rx="103" ry="8" fill="#071e1c" opacity=".22" />
      <g className={moving ? styles.suspension : undefined}>
        {/* The open cabin leaves room for the independently rendered robot driver. */}
        <path d="m24 75 15-32h38l-1 8H45L35 76Zm127-24h19l25 27-14 3-20-23h-12Z" fill="#8dcf43" />
        <path d="m158 51 15 5 21 24-13 1-23-24Z" fill="#c0eb79" />
        <path d="M24 76h157l24 8 19 11v21H18V89Z" fill="#77b738" />
        <path d="m24 76 155-2 28 10-112 6-77-2Z" fill="#a5da58" />
        <path d="M18 97h206v19H18Z" fill="#639633" />
        <path d="m91 90 70-4v24H91Z" fill="#80be3d" />
        <path d="M89 91v17m78-20v20" stroke="#477f30" strokeWidth="2" />
        <path d="M22 100H8v16h27l7-16Zm171 0-5 16h40v-14Z" fill="#69736c" />
        <path d="M207 88h12v13h-12Z" fill={cream} />
        <path d="M20 89h8v12h-8Z" fill="#dd7751" />
        <path d="M132 93h14v4h-14Z" fill="#e6e2ce" />
        <path d="m166 73 12-1 3 7-14 3Z" fill={ink} />
        <path d="M75 68h62v11H75Z" fill="#3f5b40" />
      </g>
      {[57, 181].map((x) => (
        <g key={x} transform={`translate(${x} 113)`}>
          <circle r="20" fill="#172b2a" />
          <circle r="13" fill="#aabbb0" />
          <g className={moving ? styles.wheel : undefined}>
            <path d="M-2-11h4v22h-4Zm-9 9h22v4h-22Z" fill="#647c71" />
            <circle r="5" fill="#dfe6cc" />
          </g>
          <path d="M-16-6A17 17 0 0 1 10-14" fill="none" stroke="#3a4c44" strokeWidth="2" />
        </g>
      ))}
    </>
  );
}

function PropArtwork({ kind }: { kind: RobotPropKind }): ReactNode {
  switch (kind) {
    case "book":
      return <Book />;
    case "books":
      return (
        <>
          <g transform="translate(-3 27) scale(.91)"><Book color="#cf725d" /></g>
          <g transform="translate(7 8) scale(.91)"><Book color={teal} /></g>
          <g transform="translate(-5 -9) scale(.91)"><Book color={gold} /></g>
        </>
      );
    case "plant":
      return (
        <>
          <path d="M79 80V31m0 27L55 41m24 28 27-29" fill="none" stroke="#27715c" strokeWidth="5" strokeLinecap="round" />
          <path d="M80 41C58 28 63 8 78 4c12 14 15 24 2 37Z" fill={mint} />
          <path d="M71 60C40 59 32 40 36 25c27 0 39 16 35 35Z" fill="#42b48c" />
          <path d="M88 62c-5-28 8-44 33-47 4 25-10 44-33 47Z" fill="#78cf92" />
          <path d="m54 77 52-2-7 34-18 7-22-8Z" fill="#bb7850" />
          <path d="m81 81 25-6-7 34-18 7Z" fill="#91573d" />
          <path d="m49 71 32-7 30 7-3 11-28 6-28-6Z" fill="#d09a70" />
          <path d="m58 73 22-5 22 5-22 5Z" fill="#5a4634" />
        </>
      );
    case "crate":
      return (
        <>
          <path d="m24 40 57-23 56 27-56 23Z" fill="#caac71" />
          <path d="m24 40 57 27v49l-57-26Z" fill="#a98751" />
          <path d="m81 67 56-23v47l-56 25Z" fill="#83653e" />
          <path d="m32 54 40 19v28L32 82Z" fill="#5f7155" />
          <path d="m89 72 40-17v28l-40 18Z" fill="#456356" />
          <path d="m32 53 40 48m0-28L33 81m57-9 39 12m0-29-39 47" stroke="#c0a16c" strokeWidth="7" />
          <path d="m45 39 33-13 30 14-32 13Z" fill="#dfc58c" />
        </>
      );
    case "gear":
      return (
        <>
          <path d="m69 8 22 1 3 15 12 7 15-5 11 19-12 11v14l12 10-11 19-16-5-12 7-3 15H68l-3-16-12-7-15 6-11-19 11-11V55L26 44l11-19 15 6 13-7Z" fill="#3f7776" />
          <path d="m66 4 22 1 3 15 12 7 15-5 11 19-12 11v14l12 10-11 19-16-5-12 7-3 15H65l-3-16-12-7-15 6-11-19 11-11V51L23 40l11-19 15 6 13-7Z" fill="#77aaa2" />
          <circle cx="76" cy="57" r="29" fill="#335f5b" />
          <circle cx="76" cy="57" r="21" fill={gold} />
          <circle cx="76" cy="57" r="12" fill={ink} />
          <path d="M59 24a36 36 0 0 1 39 8" fill="none" stroke="#a2cbc1" strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case "code":
      return (
        <>
          <path d="m20 17 122 5-3 77-119-8Z" fill="#356a63" />
          <path d="m26 24 109 5-3 59-106-6Z" fill="#0e3431" />
          <path d="m78 95 19 1v12l23 4v6l-66-4v-6l24-2Z" fill="#61867a" />
          <path d="m61 43-17 12 16 14m40-24 17 13-18 12M87 40 76 74" fill="none" stroke={mint} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="31" cy="22" r="2" fill={gold} />
        </>
      );
    case "car":
      return <g transform="translate(0 17) scale(.667)"><CarArtwork /></g>;
    case "lamp":
      return (
        <>
          <path d="m43 97 23-13 39 7 12 16-40 9-34-9Z" fill="#3e7771" />
          <path d="m76 93 24-34-27-29" fill="none" stroke="#799d8e" strokeWidth="8" strokeLinejoin="round" />
          <circle cx="99" cy="58" r="7" fill={gold} />
          <circle cx="75" cy="30" r="7" fill={gold} />
          <path d="m61 13 23 7 5 25-42-9Z" fill={teal} />
          <path d="m47 36 42 9-11 10-37-10Z" fill={cream} />
          <path d="M53 51 26 94l47-5 5-32Z" fill={gold} opacity=".12" />
        </>
      );
    case "ball":
      return (
        <>
          <circle cx="80" cy="63" r="47" fill="#43b3a6" />
          <path d="M51 26c31 2 57 31 69 62a47 47 0 0 1-37 22C75 73 64 46 51 26Z" fill={cream} />
          <path d="M87 17c-15 25-20 58-13 92a47 47 0 0 1-32-18c-3-22 8-56 24-72Z" fill={gold} />
          <path d="M43 34a47 47 0 0 0 68 63" fill="none" stroke="#153e3a" opacity=".15" strokeWidth="10" />
          <ellipse cx="94" cy="33" rx="11" ry="5" transform="rotate(30 94 33)" fill="white" opacity=".23" />
        </>
      );
    case "trophy":
      return (
        <>
          <path d="M54 22H33v22c0 20 20 28 33 28m40-50h21v22c0 20-20 28-33 28" fill="none" stroke="#ba923a" strokeWidth="10" />
          <path d="M51 15h59l-6 42c-2 15-13 26-24 26S55 70 55 57Z" fill={gold} />
          <path d="M80 15h30l-6 42c-2 15-13 26-24 26Z" fill="#cda241" />
          <path d="M73 79h14v17h18v12H54V96h19Z" fill={gold} />
          <path d="M49 104h62v13H49Z" fill={ink} />
          <path d="m80 29 5 10 12 2-9 8 2 12-10-6-11 6 3-12-9-8 12-2Z" fill={cream} />
        </>
      );
    case "rocket":
      return (
        <>
          <path d="m61 63-21 15-5 34 26-19m38-30 21 15 5 34-26-19" fill="#348f86" />
          <path d="M80 5c-26 20-30 53-20 91h40c10-38 6-71-20-91Z" fill={cream} />
          <path d="M80 5v91h20c10-38 6-71-20-91Z" fill="#cccfb5" />
          <path d="M61 31 80 5l19 26Z" fill={mint} />
          <circle cx="80" cy="53" r="14" fill={teal} />
          <circle cx="80" cy="53" r="9" fill="#224c58" />
          <path d="M75 49a7 7 0 0 1 9-2" fill="none" stroke="#aadacd" strokeWidth="3" strokeLinecap="round" />
          <path d="M64 91h32v11H64Z" fill={ink} />
          <path d="m70 103 10 15 10-15Z" fill={gold} />
        </>
      );
    case "picture":
      return (
        <>
          <path d="m19 19 124-5 2 95-123 7Z" fill="#90693e" />
          <path d="m17 14 124-5 2 95-123 7Z" fill="#c6aa71" />
          <path d="m26 23 106-4 2 76-106 5Z" fill="#244d4d" />
          <circle cx="105" cy="42" r="12" fill={gold} />
          <path d="m28 80 32-34 26 20 22-12 26 27v14l-106 5Z" fill="#4e9173" />
          <path d="m28 94 35-21 22 12 24-18 25 17v11l-106 5Z" fill="#68b394" />
          <path d="m48 105 22-2 16 6-22 2Z" fill="#e0c996" />
        </>
      );
  }
}

/** Decorative scenery. Width defaults to 160px; height keeps a 4:3 ratio. */
export function RobotProp({ kind, size = 160 }: { kind: RobotPropKind; size?: number }) {
  return (
    <svg
      className={styles.prop}
      data-prop-kind={kind}
      width={size}
      height={size * 0.75}
      viewBox="0 0 160 120"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="80" cy="113" rx="54" ry="5" fill="#031a17" opacity=".2" />
      <PropArtwork kind={kind} />
    </svg>
  );
}

/** Side-view car, facing right by default. The open cabin is at x=78..150, y=24..76. */
export function RobotCar({ facing = 1, moving = false }: { facing?: -1 | 1; moving?: boolean }) {
  return (
    <svg className={styles.car} data-moving={moving} viewBox="0 0 240 140" aria-hidden="true" focusable="false">
      <g transform={facing === -1 ? "translate(240 0) scale(-1 1)" : undefined}>
        <CarArtwork moving={moving} />
      </g>
    </svg>
  );
}

function Star({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${size})`} d="m0-11 3.4 7 7.6 1-5.5 5.4L7 10 0 6.4-7 10l1.5-7.6L-11-3l7.6-1Z" />;
}

/** Effects occupy a 160×120 box and never capture pointer events. */
export function RobotEffect({ kind }: { kind: RobotEffectKind | null }) {
  if (!kind) return null;
  return (
    <svg className={styles.effect} data-effect={kind} viewBox="0 0 160 120" aria-hidden="true" focusable="false">
      {kind === "impact" && (
        <g className={styles.impact}>
          <ellipse cx="80" cy="99" rx="41" ry="8" fill="none" stroke={cream} strokeWidth="3" opacity=".65" />
          <path d="m42 91-16-8m25-6-7-14m49 11 5-17m14 29 19-8M74 71l-2-11" stroke={gold} strokeWidth="4" strokeLinecap="round" />
          <path d="m56 98 13-14 9 10 11-14 17 18" fill="none" stroke={gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {kind === "stars" && (
        <g className={styles.stars}>
          <ellipse cx="80" cy="35" rx="43" ry="12" fill="none" stroke={cream} strokeWidth="1.5" opacity=".4" />
          <g className={styles.starOne} fill={gold}><Star x={40} y={30} size={0.8} /></g>
          <g className={styles.starTwo} fill={cream}><Star x={83} y={47} size={0.65} /></g>
          <g className={styles.starThree} fill={gold}><Star x={117} y={25} size={0.95} /></g>
        </g>
      )}
      {kind === "dust" && (
        <g className={styles.dust} fill="#adc4b3">
          <circle className={styles.puffOne} cx="53" cy="98" r="12" />
          <circle className={styles.puffTwo} cx="77" cy="99" r="17" />
          <circle className={styles.puffThree} cx="107" cy="101" r="11" />
        </g>
      )}
      {kind === "sparkles" && (
        <g className={styles.sparkles} fill={gold}>
          <path className={styles.starOne} d="m35 24 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" />
          <path className={styles.starTwo} d="m116 42 3 12 12 3-12 3-3 12-3-12-12-3 12-3Z" />
          <path className={styles.starThree} d="m59 76 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" />
          <circle cx="97" cy="22" r="3" fill={mint} />
          <circle cx="30" cy="77" r="3" fill={mint} />
          <circle cx="124" cy="91" r="2" fill={cream} />
        </g>
      )}
    </svg>
  );
}
