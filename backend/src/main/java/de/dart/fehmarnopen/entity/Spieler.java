package de.dart.fehmarnopen.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Ein einzelner Spieler innerhalb einer Team-Anmeldung. Die Radikal ID wird entweder direkt
 * angegeben ({@link #radikalId}) oder aus {@link #initialen} + {@link #geburtsdatum} abgeleitet
 * (siehe {@code SpielerValidierungService}).
 */
@Entity
@Table(name = "spieler")
@Data
@NoArgsConstructor
public class Spieler {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String vorname;

    @Column(nullable = false)
    private String nachname;

    @Column(name = "radikal_id")
    private String radikalId;

    private String initialen;

    private LocalDate geburtsdatum;
}
