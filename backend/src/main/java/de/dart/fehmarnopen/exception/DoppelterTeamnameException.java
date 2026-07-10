package de.dart.fehmarnopen.exception;

import de.dart.fehmarnopen.entity.Disziplin;

/**
 * Fachlicher Konflikt: In derselben Disziplin gibt es bereits eine aktive Anmeldung mit dem
 * (normalisierten, case-insensitiv gleichen) Teamnamen. Wird auf HTTP 409 gemappt; die Disziplin
 * dient dem Frontend als Feldkennung (siehe ADR 0011).
 */
public class DoppelterTeamnameException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final Disziplin disziplin;

    public DoppelterTeamnameException(Disziplin disziplin, String teamName) {
        super("Teamname ist in dieser Disziplin bereits vergeben: " + teamName);
        this.disziplin = disziplin;
    }

    public Disziplin getDisziplin() {
        return disziplin;
    }
}
