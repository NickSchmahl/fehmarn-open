package de.dart.fehmarnopen.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "turnier_config")
@Data
@NoArgsConstructor
public class TurnierConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "anmeldung_gesperrt", nullable = false)
    private boolean anmeldungGesperrt;

    @Column(name = "anmeldeschluss_datum")
    private LocalDateTime anmeldeschlussDatum;
}
