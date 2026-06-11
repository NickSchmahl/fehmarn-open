package de.dart.fehmarnopen.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@ConfigurationProperties(prefix = "fehmarnopen.mail")
@Component
public class MailProperties {

    /** Absenderadresse der Bestätigungsmails. */
    private String from = "noreply@fehmarn-open.de";

    /** Schaltet den tatsächlichen Versand ab (z.B. in Tests); Aufrufe werden dann nur geloggt. */
    private boolean enabled = true;
}
