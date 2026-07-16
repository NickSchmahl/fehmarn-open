package de.dart.fehmarnopen.exception;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        List<FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> new FieldError(err.getField(), err.getDefaultMessage()))
                .toList();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.ofValidation(errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(400, "Ungültiger oder fehlender Request-Body"));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of(404, "Ressource nicht gefunden"));
    }

    @ExceptionHandler(AnmeldungGesperrtException.class)
    public ResponseEntity<ErrorResponse> handleAnmeldungGesperrt(AnmeldungGesperrtException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ErrorResponse.of(403, ex.getMessage()));
    }

    @ExceptionHandler(DoppelterTeamnameException.class)
    public ResponseEntity<ErrorResponse> handleDoppelterTeamname(DoppelterTeamnameException ex) {
        // Disziplin als Feldkennung mitgeben, damit das Frontend den Fehler dem richtigen
        // Teamname-Feld zuordnen kann (siehe ADR 0011).
        FieldError feld = new FieldError(ex.getDisziplin().name(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of(409, ex.getMessage(), List.of(feld)));
    }

    @ExceptionHandler(DoppelterSpielerException.class)
    public ResponseEntity<ErrorResponse> handleDoppelterSpieler(DoppelterSpielerException ex) {
        // Feldkennung "<DISZIPLIN>:<meldungIndex>", damit das Frontend den Fehler der genauen Einzel-Meldung
        // zuordnen kann (siehe ADR 0011).
        FieldError feld = new FieldError(ex.getDisziplin().name() + ":" + ex.getMeldungIndex(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of(409, ex.getMessage(), List.of(feld)));
    }

    @ExceptionHandler(NichtGefundenException.class)
    public ResponseEntity<ErrorResponse> handleNichtGefunden(NichtGefundenException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of(404, ex.getMessage()));
    }

    @ExceptionHandler(UngueltigeAnmeldungException.class)
    public ResponseEntity<ErrorResponse> handleUngueltigeAnmeldung(UngueltigeAnmeldungException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.of(400, ex.getMessage()));
    }

    @ExceptionHandler(DoppelteRadikalIdException.class)
    public ResponseEntity<ErrorResponse> handleDoppelteRadikalId(DoppelteRadikalIdException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of(409, ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unerwarteter Fehler aufgetreten", ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(500, "Ein unerwarteter Fehler ist aufgetreten"));
    }
}
