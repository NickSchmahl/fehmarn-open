package de.dart.fehmarnopen.mail;

import de.dart.fehmarnopen.config.MailProperties;
import de.dart.fehmarnopen.event.AbmeldungBestaetigtEvent;
import de.dart.fehmarnopen.event.AnmeldungBestaetigtEvent;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

/** Rendert Thymeleaf-Templates und versendet die Bestätigungsmails als HTML. */
@Service
@RequiredArgsConstructor
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final MailProperties mailProperties;

    public void sendeAnmeldebestaetigung(AnmeldungBestaetigtEvent event) {
        Context context = new Context();
        context.setVariable("vorname", event.vorname());
        context.setVariable("nachname", event.nachname());
        context.setVariable("disziplinen", event.disziplinen());
        sende(event.email(), "Fehmarn Open – Anmeldebestätigung", "mail/anmeldung-bestaetigung", context);
    }

    public void sendeAbmeldebestaetigung(AbmeldungBestaetigtEvent event) {
        Context context = new Context();
        context.setVariable("vorname", event.vorname());
        context.setVariable("nachname", event.nachname());
        context.setVariable("disziplin", event.disziplin());
        context.setVariable("teamName", event.teamName());
        sende(event.email(), "Fehmarn Open – Abmeldebestätigung", "mail/abmeldung-bestaetigung", context);
    }

    private void sende(String an, String betreff, String template, Context context) {
        if (!mailProperties.isEnabled()) {
            log.info("Mailversand deaktiviert – '{}' an {} wird nicht gesendet.", betreff, an);
            return;
        }
        try {
            String html = templateEngine.process(template, context);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(mailProperties.getFrom());
            helper.setTo(an);
            helper.setSubject(betreff);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            // Best-effort: ein Mail-Fehler darf den auslösenden Vorgang nicht beeinträchtigen.
            throw new MailVersandException("Mail '" + betreff + "' an " + an + " fehlgeschlagen", e);
        }
    }

    static class MailVersandException extends RuntimeException {
        MailVersandException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
