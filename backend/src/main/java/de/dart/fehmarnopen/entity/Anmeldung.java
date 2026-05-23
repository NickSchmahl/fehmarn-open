package de.dart.fehmarnopen.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

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

    @Column(nullable = false)
    private String disziplin;

    @Column(name = "team_name")
    private String teamName;

    @Column(nullable = false, unique = true)
    private String abmeldetoken;

    @Column(nullable = false)
    private boolean abgemeldet = false;

    @PrePersist
    public void prePersist() {
        this.abmeldetoken = UUID.randomUUID().toString();
    }
}
