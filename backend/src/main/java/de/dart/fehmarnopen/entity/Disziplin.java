package de.dart.fehmarnopen.entity;

public enum Disziplin {
    HERRENEINZEL("Herreneinzel"),
    DAMENEINZEL("Dameneinzel"),
    HERRENDOPPEL("Herrendoppel"),
    DAMENDOPPEL("Damendoppel"),
    TRIPLE_MIX("Triple Mix"),
    TEAMWETTBEWERB("Teamwettbewerb");

    private final String label;

    Disziplin(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
