package de.dart.fehmarnopen.exception;

public class AnmeldungGesperrtException extends RuntimeException {

    public AnmeldungGesperrtException(String anmeldeschlussDatum) {
        super("Der Anmeldeschluss war am " + anmeldeschlussDatum + " – eine Anmeldung ist nicht mehr möglich.");
    }
}
