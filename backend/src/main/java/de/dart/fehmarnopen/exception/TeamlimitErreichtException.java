package de.dart.fehmarnopen.exception;

/**
 * Fachlicher Konflikt: Der Teamwettbewerb ist ausgebucht – die angefragten Teams passen nicht mehr in
 * das Limit. Wird auf HTTP 409 gemappt; Feldkennung fürs Frontend ist die Disziplin
 * {@code TEAMWETTBEWERB} (siehe ADR 0011).
 */
public class TeamlimitErreichtException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public TeamlimitErreichtException(int maxTeams) {
        super("Der Teamwettbewerb ist ausgebucht – es sind bereits " + maxTeams + " Teams angemeldet.");
    }
}
