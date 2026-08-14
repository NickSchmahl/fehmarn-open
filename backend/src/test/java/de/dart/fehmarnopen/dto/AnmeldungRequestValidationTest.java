package de.dart.fehmarnopen.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AnmeldungRequestValidationTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void radikalIdMitAnhaengendemGrossbuchstaben_wirdAkzeptiert() {
        AnmeldungRequest.SpielerRequest s = new AnmeldungRequest.SpielerRequest(
                "Max", "Mustermann", "MM01011990A", null, null);
        Set<ConstraintViolation<AnmeldungRequest.SpielerRequest>> violations = validator.validate(s);
        assertThat(violations).isEmpty();
    }

    @Test
    void radikalIdMitInvalidemSuffix_wirdAbgelehnt() {
        AnmeldungRequest.SpielerRequest s = new AnmeldungRequest.SpielerRequest(
                "Max", "Mustermann", "MM01011990a", null, null); // lower-case suffix not allowed
        Set<ConstraintViolation<AnmeldungRequest.SpielerRequest>> violations = validator.validate(s);
        assertThat(violations).isNotEmpty();
    }
}
