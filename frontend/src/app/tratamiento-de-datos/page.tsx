import { DatabaseZap } from "lucide-react";

import { LegalDocument } from "@/components/legal-document";

export default async function TratamientoDeDatosPage({
  searchParams,
}: {
  searchParams: Promise<{ embedded?: string }>;
}) {
  const { embedded } = await searchParams;
  return (
    <LegalDocument
      embedded={embedded === "1"}
      title="Tratamiento de Datos Personales"
      eyebrow="Autorización informada"
      icon={DatabaseZap}
      intro="Esta política explica cómo AlgoLab recolecta y utiliza datos personales para prestar la experiencia educativa. El tratamiento se realiza bajo los principios de legalidad, finalidad, libertad, veracidad, transparencia, acceso restringido, seguridad y confidencialidad previstos en la legislación colombiana."
      sections={[
        {
          title: "1. Responsable y alcance",
          content: <p>El proyecto académico AlgoLab es responsable del tratamiento efectuado dentro de la plataforma. La autorización cubre el portal web, los servicios de autenticación, el módulo de inteligencia artificial y la aplicación de realidad mixta vinculada a la cuenta.</p>,
        },
        {
          title: "2. Datos que podemos tratar",
          content: <ul><li><strong>Identificación y contacto:</strong> nombre, correo institucional, alias y celular cuando lo suministres.</li><li><strong>Perfil académico:</strong> institución, programa, avatar y biografía voluntaria.</li><li><strong>Aprendizaje:</strong> niveles, puntajes, intentos, respuestas, tiempos, fortalezas y aspectos por mejorar.</li><li><strong>Seguridad y operación:</strong> registros de acceso, verificaciones, dispositivo y eventos técnicos necesarios para prevenir abuso.</li><li><strong>Contenido aportado:</strong> imagen de perfil, consultas y archivos que decidas enviar.</li></ul>,
        },
        {
          title: "3. Finalidades",
          content: <ul><li>Crear, autenticar y proteger tu cuenta.</li><li>Sincronizar perfil y progreso entre la web y las gafas.</li><li>Personalizar la ruta educativa y generar reportes o recomendaciones pedagógicas.</li><li>Permitir a docentes autorizados acompañar el progreso académico.</li><li>Atender solicitudes, corregir errores, medir estabilidad y mejorar la experiencia.</li><li>Cumplir obligaciones legales y responder a incidentes de seguridad.</li></ul>,
        },
        {
          title: "4. Decisiones automatizadas e IA",
          content: <p>AlgoLab puede analizar resultados de actividades para elaborar recomendaciones. Estas recomendaciones son orientativas, no producen por sí solas decisiones académicas definitivas y pueden ser revisadas por una persona.</p>,
        },
        {
          title: "5. Acceso y circulación",
          content: <p>Los datos solo se comparten con personal autorizado y proveedores técnicos indispensables para operar la plataforma, sujetos a medidas de confidencialidad y seguridad. No se comercializan datos personales. El acceso docente se limita a fines de acompañamiento académico.</p>,
        },
        {
          title: "6. Conservación y seguridad",
          content: <p>La información se conserva durante la vigencia de la cuenta y el tiempo adicional necesario para fines académicos, legales o de seguridad. Se aplican controles de autenticación, acceso restringido y protección técnica, aunque ningún sistema conectado puede garantizar riesgo cero.</p>,
        },
        {
          title: "7. Tus derechos",
          content: <p>Puedes conocer, actualizar, rectificar y solicitar prueba de la autorización; pedir información sobre el uso dado a tus datos; presentar consultas o reclamos; revocar la autorización o solicitar supresión cuando sea legalmente procedente; y acudir ante la Superintendencia de Industria y Comercio una vez agotado el trámite correspondiente.</p>,
        },
        {
          title: "8. Consultas y revocación",
          content: <p>Puedes ejercer tus derechos mediante los canales institucionales de soporte publicados por AlgoLab, identificándote y describiendo claramente tu solicitud. Revocar tratamientos indispensables puede impedir que la cuenta continúe operando.</p>,
        },
        {
          title: "9. Datos de menores",
          content: <p>Si el usuario es menor de edad, el registro y uso deben contar con acompañamiento y autorización de su representante legal, respetando el interés superior del menor y sus derechos fundamentales.</p>,
        },
      ]}
    />
  );
}
