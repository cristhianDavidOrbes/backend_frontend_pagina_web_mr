import { IntroPreferences } from "@/components/intro-preferences";
import { PageHead } from "@/components/ui";

export default function ConfiguracionAdministradorPage() {
  return <div className="mx-auto max-w-4xl space-y-6"><PageHead title="Configuración" description="Personaliza AlgoLab en este navegador." /><IntroPreferences /></div>;
}
