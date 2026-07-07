package de.dart.fehmarnopen.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Eine Team-Anmeldung für genau eine Disziplin. Umfasst die Liste der gemeldeten
 * {@link Spieler} (inkl. Ersatzspieler) und – bei Team-Disziplinen – den Teamnamen.
 */
@Entity
@Table(name = "anmeldung")
@Data
@NoArgsConstructor
public class Anmeldung {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Disziplin disziplin;

    @Column(name = "team_name")
    private String teamName;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "anmeldung_id", nullable = false)
    private List<Spieler> spieler = new ArrayList<>();

    @Column(nullable = false)
    private boolean abgemeldet;

    @Column(name = "abgemeldet_am")
    private LocalDateTime abgemeldetAm;

    @Column(nullable = false)
    private boolean anwesend;

    @Column(name = "angemeldet_am")
    private LocalDateTime angemeldetAm;

    @PrePersist
    public void prePersist() {
        this.angemeldetAm = LocalDateTime.now();
    }
}
