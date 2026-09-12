package de.dart.fehmarnopen.dto;

import java.time.LocalDate;

/**
 * Öffentlicher Anmeldestatus fürs Frontend: ob die Anmeldung offen ist, der Stichtag sowie ob der
 * Teamwettbewerb sein Teamlimit ({@code maxTeams}) erreicht hat.
 */
public record AnmeldeschlussStatusResponse(
        boolean anmeldungOffen, LocalDate anmeldeschluss, boolean teamwettbewerbAusgebucht, int maxTeams) {}
