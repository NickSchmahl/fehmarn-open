package de.dart.fehmarnopen.exception;

/**
 * Fachlicher Konflikt: Dieselbe Radikal ID wurde innerhalb einer Disziplin mehrfach im selben
 * Anmeldevorgang gemeldet (#169/#D). Wird auf HTTP 409 gemappt.
 */
public class DoppelteRadikalIdException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public DoppelteRadikalIdException(String radikalId) {
        super("Diese Person ist in dieser Disziplin bereits gemeldet (Radikal ID " + radikalId + ").");
    }
}
