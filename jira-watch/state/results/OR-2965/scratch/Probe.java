import java.util.Properties;
public class Probe {
    public static void main(String[] a) throws Exception {
        for (String c : new String[]{"jakarta.mail.Session", "org.eclipse.angus.mail.smtp.SMTPTransport", "com.sun.mail.smtp.SMTPTransport", "javax.mail.Session", "com.sun.mail.util.MailLogger"}) {
            try {
                Class<?> k = Class.forName(c);
                System.out.println("LOADABLE   " + c + " <- " + k.getProtectionDomain().getCodeSource().getLocation());
            } catch (ClassNotFoundException e) {
                System.out.println("ABSENT     " + c + " (ClassNotFoundException)");
            }
        }
        jakarta.mail.Session s = jakarta.mail.Session.getInstance(new Properties());
        System.out.println("smtp transport -> " + s.getTransport("smtp").getClass().getName());
        System.out.println("providers: ");
        for (jakarta.mail.Provider p : s.getProviders()) if (p.getProtocol().equals("smtp")) System.out.println("   " + p);
    }
}
