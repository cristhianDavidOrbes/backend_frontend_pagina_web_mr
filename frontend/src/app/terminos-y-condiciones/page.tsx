import { FileCheck2 } from "lucide-react";

import { LegalDocument } from "@/components/legal-document";

export default function TerminosYCondicionesPage() {
  return (
    <LegalDocument
      title="Términos y Condiciones"
      eyebrow="Uso responsable de la plataforma"
      icon={FileCheck2}
      intro="Estos términos regulan el acceso y uso de AlgoLab, una experiencia educativa que conecta el portal web, actividades de programación, inteligencia artificial y experiencias de realidad mixta. Al crear una cuenta declaras que leíste y aceptas estas condiciones."
      sections={[
        {
          title: "1. Finalidad del servicio",
          content: <p>AlgoLab apoya el aprendizaje de programación orientada a objetos mediante contenidos, ejercicios, reportes pedagógicos y experiencias interactivas. No sustituye la orientación académica del docente ni garantiza por sí solo resultados de aprendizaje.</p>,
        },
        {
          title: "2. Cuenta y acceso",
          content: <ul><li>Debes suministrar información verdadera, actualizada y asociada a tu identidad académica.</li><li>Eres responsable de proteger tu contraseña y los métodos de verificación de tu cuenta.</li><li>No puedes compartir la cuenta, suplantar a otra persona ni intentar evadir controles de seguridad.</li></ul>,
        },
        {
          title: "3. Uso permitido",
          content: <p>Puedes utilizar AlgoLab con fines educativos y académicos. Está prohibido afectar la disponibilidad del sistema, introducir código malicioso, acceder a información ajena, acosar a otros usuarios o utilizar el contenido para actividades ilícitas.</p>,
        },
        {
          title: "4. Inteligencia artificial",
          content: <p>Las respuestas y recomendaciones generadas por IA tienen carácter pedagógico y pueden contener errores. Debes contrastarlas con el material del curso y las indicaciones del docente. No ingreses información sensible en conversaciones con la IA.</p>,
        },
        {
          title: "5. Realidad mixta y seguridad física",
          content: <p>Antes de usar las gafas debes disponer de un área despejada y respetar las advertencias del dispositivo. Interrumpe la actividad si presentas mareo, incomodidad o pérdida de orientación. El usuario conserva la responsabilidad sobre su espacio físico.</p>,
        },
        {
          title: "6. Contenido y propiedad intelectual",
          content: <p>El software, diseño y contenidos propios de AlgoLab están protegidos por las normas aplicables. Los recursos de terceros conservan sus respectivas licencias. El acceso a la plataforma no transfiere derechos de propiedad sobre ellos.</p>,
        },
        {
          title: "7. Disponibilidad y cambios",
          content: <p>La plataforma puede recibir mantenimiento, correcciones o actualizaciones. Las condiciones podrán modificarse cuando cambie el servicio o la normativa; si el cambio es relevante se solicitará una nueva aceptación.</p>,
        },
        {
          title: "8. Suspensión y ley aplicable",
          content: <p>AlgoLab podrá limitar una cuenta cuando exista riesgo de seguridad o incumplimiento de estas condiciones, respetando el contexto académico. Estos términos se interpretan conforme a la legislación colombiana.</p>,
        },
      ]}
    />
  );
}
