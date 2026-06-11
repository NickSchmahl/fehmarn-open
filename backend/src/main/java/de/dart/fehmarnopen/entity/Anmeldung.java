package de.dart.fehmarnopen.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "anmeldung")
@Data
@NoArgsConstructor
public class Anmeldung {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "teilnehmer_id")
    private Teilnehmer teilnehmer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Disziplin disziplin;

    @Column(name = "team_name")
    private String teamName;

    @Column(nullable = false, unique = true)
    private String abmeldetoken;

    @Column(nullable = false)
    private boolean abgemeldet = false;

    @Column(name = "abgemeldet_am")
    private LocalDateTime abgemeldetAm;

    @Column(nullable = false)
    private boolean anwesend = false;

    @PrePersist
    public void prePersist() {
        this.abmeldetoken = UUID.randomUUID().toString();
    }
}
