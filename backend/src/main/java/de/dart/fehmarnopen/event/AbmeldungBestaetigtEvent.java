package de.dart.fehmarnopen.event;

import de.dart.fehmarnopen.entity.Disziplin;

/** Wird nach einer Abmeldung publiziert; löst die Abmeldebestätigung aus. */
public record AbmeldungBestaetigtEvent(
        String email, String vorname, String nachname, Disziplin disziplin, String teamName) {}
