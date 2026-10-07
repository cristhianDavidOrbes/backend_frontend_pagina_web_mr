import java.io.IOException;
import java.lang.instrument.Instrumentation;
import com.sun.tools.attach.VirtualMachine;

/** Cierra con shutdown hooks únicamente el lanzador de verificación H2 local. */
public final class VerificationShutdown {
    private static final String EXPECTED_MAIN =
            "com.algolab.backend_werb_mr.verification.ReleaseVerificationServer";

    public static void main(String[] args) throws Exception {
        if (args.length != 2 || !args[0].matches("[1-9][0-9]*")) {
            throw new IllegalArgumentException("Se requieren PID verificado y ruta del agente de cierre");
        }
        VirtualMachine vm = VirtualMachine.attach(args[0]);
        try {
            if (!EXPECTED_MAIN.equals(vm.getSystemProperties().getProperty("sun.java.command"))) {
                throw new IllegalStateException("Se rechaza cerrar un proceso ajeno a la verificación");
            }
            vm.loadAgent(args[1]);
            System.out.println("ALGOLAB_VERIFICATION_GRACEFUL_SHUTDOWN_REQUESTED pid=" + args[0]);
        } finally {
            try { vm.detach(); } catch (IOException alreadyClosed) { }
        }
    }

    public static final class Agent {
        public static void agentmain(String args, Instrumentation instrumentation) {
            if (!EXPECTED_MAIN.equals(System.getProperty("sun.java.command"))) {
                throw new IllegalStateException("Este agente solo cierra el servidor H2 de prueba");
            }
            new Thread(() -> System.exit(0), "verification-graceful-shutdown").start();
        }
    }
}
