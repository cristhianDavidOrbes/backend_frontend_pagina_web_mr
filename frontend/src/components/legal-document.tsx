import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import css from "./legal-document.module.css";

type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalDocument({
  title,
  eyebrow,
  intro,
  icon: Icon,
  sections,
  embedded = false,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  icon: LucideIcon;
  sections: LegalSection[];
  embedded?: boolean;
}) {
  const document = (
    <article className={`${css.document} ${embedded ? css.embeddedDocument : ""}`}>
      <header className={css.header}>
        <span className={css.icon} aria-hidden><Icon size={30} /></span>
        <div>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className={css.content}>
        <p className={css.intro}>{intro}</p>
        {sections.map((section) => (
          <section className={css.section} key={section.title}>
            <h2>{section.title}</h2>
            {section.content}
          </section>
        ))}
        <p className={css.version}>Versión vigente: 26 de agosto de 2026 · AlgoLab</p>
      </div>
    </article>
  );

  if (embedded) {
    return <main className={css.embeddedPage}>{document}</main>;
  }

  return (
    <main className={css.page}>
      <div className={css.shell}>
        <Link className={css.back} href="/registrarse">
          <ArrowLeft size={17} aria-hidden /> Volver al registro
        </Link>
        {document}
      </div>
    </main>
  );
}
