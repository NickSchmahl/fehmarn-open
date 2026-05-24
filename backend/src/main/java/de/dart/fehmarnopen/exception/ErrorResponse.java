package de.dart.fehmarnopen.exception;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(int status, String message, List<FieldError> errors, Instant timestamp) {

    public static ErrorResponse of(int status, String message) {
        return new ErrorResponse(status, message, null, Instant.now());
    }

    public static ErrorResponse ofValidation(List<FieldError> errors) {
        return new ErrorResponse(400, "Validierungsfehler", errors, Instant.now());
    }
}
