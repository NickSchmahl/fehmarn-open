package de.dart.fehmarnopen.exception;

import de.dart.fehmarnopen.entity.Disziplin;

/**
 * Fachlicher Konflikt: In derselben Einzel-Disziplin ist derselbe Spieler bereits gemeldet – gleicher
 * (normalisierter, case-insensitiver) Vorname+Nachname ODER gleiche Radikal ID (#170). Wird auf HTTP 409
 * gemappt; {@code disziplin}+{@code meldungIndex} bilden die Feldkennung fürs Frontend (siehe ADR 0011).
 */
public class DoppelterSpielerException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final Disziplin disziplin;
    private final int meldungIndex;

    public DoppelterSpielerException(Disziplin disziplin, int meldungIndex, String message) {
        super(message);
        this.disziplin = disziplin;
        this.meldungIndex = meldungIndex;
    }

    public Disziplin getDisziplin() {
        return disziplin;
    }

    public int getMeldungIndex() {
        return meldungIndex;
    }
}
