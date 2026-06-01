package de.dart.fehmarnopen.dto;

import de.dart.fehmarnopen.entity.Disziplin;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AnmeldungRequest(
        @NotBlank(message = "Vorname ist Pflichtfeld") String vorname,
        @NotBlank(message = "Nachname ist Pflichtfeld") String nachname,
        @NotBlank(message = "E-Mail ist Pflichtfeld") @Email(message = "Ungültige E-Mail-Adresse") String email,
        String radicalId,
        @NotEmpty(message = "Mindestens eine Disziplin muss gewählt sein")
                List<@Valid DisziplinAnmeldung> disziplinen) {
    public record DisziplinAnmeldung(
            @NotNull(message = "Disziplin darf nicht leer sein") Disziplin disziplin, String teamName) {}
}
