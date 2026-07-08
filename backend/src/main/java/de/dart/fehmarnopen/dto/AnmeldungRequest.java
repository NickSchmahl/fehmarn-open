package de.dart.fehmarnopen.dto;

import de.dart.fehmarnopen.entity.Disziplin;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

/**
 * Team-Anmeldung: je gewählter Disziplin eine Spielerliste. Es gibt kein Kontaktfeld mehr –
 * eine Meldung besteht ausschließlich aus Spielerdaten und (bei Team-Disziplinen) dem Teamnamen.
 * Spielerzahl je Disziplin und die Radikal-ID-Regel werden fachlich im
 * {@code SpielerValidierungService} geprüft.
 */
public record AnmeldungRequest(
        @NotEmpty(message = "Mindestens eine Disziplin muss gewählt sein") List<@Valid DisziplinAnmeldung> disziplinen) {

    public record DisziplinAnmeldung(
            @NotNull(message = "Disziplin darf nicht leer sein") Disziplin disziplin,
            String teamName,
            @NotEmpty(message = "Mindestens ein Spieler muss angegeben werden") List<@Valid SpielerRequest> spieler) {}

    public record SpielerRequest(
            @NotBlank(message = "Vorname ist Pflichtfeld") String vorname,
            @NotBlank(message = "Nachname ist Pflichtfeld") String nachname,
            String radikalId,
            String initialen,
            LocalDate geburtsdatum) {}
}
