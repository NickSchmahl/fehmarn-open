package de.dart.fehmarnopen.dto;

import java.time.LocalDate;

/** Öffentlicher Anmeldeschluss-Status fürs Frontend: ob Anmeldung offen ist und der Stichtag. */
public record AnmeldeschlussStatusResponse(boolean anmeldungOffen, LocalDate anmeldeschluss) {}
