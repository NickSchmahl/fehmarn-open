package de.dart.fehmarnopen.event;

import de.dart.fehmarnopen.entity.Disziplin;
import java.util.List;

/** Wird nach erfolgreicher Anmeldung publiziert; löst die Bestätigungsmail aus. */
public record AnmeldungBestaetigtEvent(String email, String vorname, String nachname, List<Position> disziplinen) {

    public record Position(Disziplin disziplin, String teamName) {}
}
