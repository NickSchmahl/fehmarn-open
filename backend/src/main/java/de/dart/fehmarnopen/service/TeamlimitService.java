package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.TeamlimitErreichtException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Kapselt das Teamlimit des Teamwettbewerbs: höchstens {@value #MAX_TEAMS} aktive (nicht abgemeldete)
 * Teams. Gilt für die öffentliche Online-Anmeldung; die Admin-Reaktivierung darf überziehen
 * (Warnung im Frontend).
 */
@Service
@RequiredArgsConstructor
public class TeamlimitService {

    /** Feste fachliche Obergrenze – vom Veranstalter vorgegeben (Spielplan/Boards). */
    private static final int MAX_TEAMS = 96;

    private final AnmeldungRepository anmeldungRepository;

    public int maxTeams() {
        return MAX_TEAMS;
    }

    public boolean istAusgebucht() {
        return aktiveTeams() >= MAX_TEAMS;
    }

    /**
     * Prüft, ob alle Teamwettbewerb-Meldungen des Requests noch ins Limit passen. Entweder passen
     * alle oder der Request wird komplett abgelehnt – keine Teil-Anmeldung.
     */
    public void pruefePlatzFuer(AnmeldungRequest request) {
        long angefragteTeams = request.disziplinen().stream()
                .filter(eingabe -> eingabe.disziplin() == Disziplin.TEAMWETTBEWERB)
                .count();
        if (angefragteTeams == 0) {
            return;
        }
        if (aktiveTeams() + angefragteTeams > MAX_TEAMS) {
            throw new TeamlimitErreichtException(MAX_TEAMS);
        }
    }

    private long aktiveTeams() {
        return anmeldungRepository.countByDisziplinAndAbgemeldetFalse(Disziplin.TEAMWETTBEWERB);
    }
}
