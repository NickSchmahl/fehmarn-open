package de.dart.fehmarnopen.exception;

public class AnmeldungGesperrtException extends RuntimeException {

    public AnmeldungGesperrtException() {
        super("Anmeldung ist derzeit gesperrt");
    }
}
