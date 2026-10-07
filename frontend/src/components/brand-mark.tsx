/** Isotipo de AlgoLab: matraz de laboratorio con código burbujeando. */
export function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 -6 200 200">
      <FlaskShapes />
    </svg>
  );
}

function FlaskShapes() {
  return (
    <>
      <path d="M62 112H138L158 150Q164 166 148 168H52Q36 166 42 150Z" fill="#1E8F6C" />
      <path
        d="M80 20H120V28H114V68L158 150Q164 166 148 168H52Q36 166 42 150L86 68V28H80Z"
        fill="none"
        stroke="#12352C"
        strokeLinejoin="round"
        strokeWidth="9"
      />
      <path
        d="M81 136L70 145L81 154M95 156L105 134M119 136L130 145L119 154"
        fill="none"
        stroke="#F1E8D2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <circle cx="96" cy="94" r="7" fill="none" stroke="#12352C" strokeWidth="4.5" />
      <circle cx="103" cy="76" r="4.5" fill="none" stroke="#12352C" strokeWidth="4" />
      <circle cx="100" cy="49" r="4" fill="#C98A12" />
    </>
  );
}

/** Isotipo con fondo (el mismo del ícono de la app), junto al nombre AlgoLab. */
export function BrandMark() {
  return (
    <span className="brand-mark">
      <svg aria-hidden="true" viewBox="0 0 200 200">
        <rect fill="#F1E8D2" height="200" rx="44" width="200" />
        <rect fill="none" height="182" rx="36" stroke="#12352C" strokeOpacity=".55" strokeWidth="5" width="182" x="9" y="9" />
        <g transform="translate(24 28) scale(.76)">
          <FlaskShapes />
        </g>
      </svg>
    </span>
  );
}
