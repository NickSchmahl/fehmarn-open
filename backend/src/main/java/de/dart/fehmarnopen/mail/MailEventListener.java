package de.dart.fehmarnopen.mail;

import de.dart.fehmarnopen.event.AbmeldungBestaetigtEvent;
import de.dart.fehmarnopen.event.AnmeldungBestaetigtEvent;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Versendet Bestätigungsmails erst NACH erfolgreichem Commit und asynchron. Fehler werden
 * geloggt, aber nicht weitergeworfen – ein Mailproblem darf den Vorgang nicht beeinträchtigen.
 */
@Component
@RequiredArgsConstructor
public class MailEventListener {

    private static final Logger log = LoggerFactory.getLogger(MailEventListener.class);

    private final MailService mailService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAnmeldung(AnmeldungBestaetigtEvent event) {
        try {
            mailService.sendeAnmeldebestaetigung(event);
        } catch (Exception e) {
            log.error("Anmeldebestätigung an {} fehlgeschlagen", event.email(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAbmeldung(AbmeldungBestaetigtEvent event) {
        try {
            mailService.sendeAbmeldebestaetigung(event);
        } catch (Exception e) {
            log.error("Abmeldebestätigung an {} fehlgeschlagen", event.email(), e);
        }
    }
}
