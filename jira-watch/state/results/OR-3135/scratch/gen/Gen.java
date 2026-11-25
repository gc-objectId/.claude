import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.jackson2.CoreJackson2Module;
import org.springframework.security.jackson2.SecurityJackson2Modules;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.jackson2.OAuth2ClientJackson2Module;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import java.time.Instant;
import java.util.List;
import java.util.Map;
public class Gen {
    public static void main(String[] a) throws Exception {
        var mapper = new ObjectMapper();
        mapper.registerModules(SecurityJackson2Modules.getModules(Gen.class.getClassLoader()));
        mapper.registerModule(new OAuth2ClientJackson2Module());
        mapper.registerModule(new CoreJackson2Module());
        var idToken = new OidcIdToken("tok", Instant.now(), Instant.now().plusSeconds(21600), Map.of("sub", a[0]));
        var auths = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        var token = new OAuth2AuthenticationToken(new DefaultOidcUser(auths, idToken), auths, "cognito");
        System.out.println(mapper.writeValueAsString(new SecurityContextImpl(token)));
    }
}
