package de.dart.fehmarnopen.exception;

/** Fachlicher Validierungsfehler bei einer Team-Anmeldung (z. B. falsche Spielerzahl je Disziplin). */
public class UngueltigeAnmeldungException extends RuntimeException {

    public UngueltigeAnmeldungException(String message) {
        super(message);
    }
}
