type Props = {
  lenguaje: "python" | "java";
  size?: number;
  className?: string;
};

/** Logos monocromáticos de los lenguajes: toman el color del texto (currentColor). */
export function LanguageIcon({ lenguaje, size = 16, className }: Props) {
  if (lenguaje === "python") {
    const mitad =
      "M11.9 2C7.4 2 7.7 4 7.7 4v2.1h4.4v.7H5.9S3 6.5 3 11s2.6 4.4 2.6 4.4h1.5v-2.1s-.1-2.6 2.5-2.6h4.3s2.4 0 2.4-2.3V4.4S16.6 2 11.9 2Zm-2.4 1.4a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z";
    return (
      <svg aria-hidden="true" className={className} fill="currentColor" height={size} viewBox="0 0 24 24" width={size}>
        <path d={mitad} fillRule="evenodd" />
        <path d={mitad} fillRule="evenodd" transform="rotate(180 12 12)" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M9 2.5c-1.2 1.3 1.2 2.4 0 3.8M12.5 2.5c-1.2 1.3 1.2 2.4 0 3.8" />
      <path d="M5 9.5h11v4.2a5.3 5.3 0 0 1-5.3 5.3h-.4A5.3 5.3 0 0 1 5 13.7Z" />
      <path d="M16 11h1.4a2.3 2.3 0 0 1 0 4.6H15.6" />
      <path d="M4 21.5h14" />
    </svg>
  );
}
