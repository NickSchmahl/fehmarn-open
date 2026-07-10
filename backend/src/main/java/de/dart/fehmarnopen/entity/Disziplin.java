package de.dart.fehmarnopen.entity;

public enum Disziplin {
    TEAMWETTBEWERB("Teamwettbewerb"),
    HERRENEINZEL("Herreneinzel"),
    DAMENEINZEL("Dameneinzel"),
    U18("U18-Turnier"),
    TRIPLE_MIX("Triple Mix"),
    HERRENDOPPEL("Herrendoppel"),
    DAMENDOPPEL("Damendoppel");

    private final String label;

    Disziplin(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
