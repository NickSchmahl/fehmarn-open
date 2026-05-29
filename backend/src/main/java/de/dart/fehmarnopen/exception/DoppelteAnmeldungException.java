package de.dart.fehmarnopen.exception;

public class DoppelteAnmeldungException extends RuntimeException {

    public DoppelteAnmeldungException(String disziplin) {
        super("Bereits für Disziplin angemeldet: " + disziplin);
    }
}
