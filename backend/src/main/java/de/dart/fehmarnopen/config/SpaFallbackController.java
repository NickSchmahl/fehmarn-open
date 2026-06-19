package de.dart.fehmarnopen.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Leitet die clientseitigen Angular-Routen an die Einstiegsseite (index.html) weiter,
 * damit ein direkter Aufruf (Bookmark / F5 / geteilter Link) nicht in einem 404 endet,
 * sondern der Angular-Router die Route übernimmt.
 *
 * <p>Pfade mit Dateiendung (z.B. main-ABC.js, styles.css) sowie "/" werden vom
 * statischen Resource-Handler bzw. der Welcome-Page von Spring bedient. /api/** wird
 * von den REST-Controllern behandelt. Neue Top-Level-Routen aus app.routes.ts hier ergänzen.
 */
@Controller
public class SpaFallbackController {

    @GetMapping({"/anmeldung", "/teilnehmer", "/flyer", "/admin", "/admin/**"})
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
