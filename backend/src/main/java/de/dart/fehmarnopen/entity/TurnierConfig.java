package de.dart.fehmarnopen.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "turnier_config")
@Data
@NoArgsConstructor
public class TurnierConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "anmeldung_gesperrt", nullable = false)
    private boolean anmeldungGesperrt = false;

    @Column(name = "anmeldeschluss_datum")
    private LocalDateTime anmeldeschlussDatum;
}
