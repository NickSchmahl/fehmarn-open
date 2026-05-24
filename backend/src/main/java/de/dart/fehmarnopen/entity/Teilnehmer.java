package de.dart.fehmarnopen.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "teilnehmer")
@Data
@NoArgsConstructor
public class Teilnehmer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String vorname;

    @Column(nullable = false)
    private String nachname;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "radical_id")
    private String radicalId;

    private String initialen;

    @Column(name = "angemeldet_am")
    private LocalDateTime angemeldetAm;

    @PrePersist
    public void prePersist() {
        this.angemeldetAm = LocalDateTime.now();
    }
}
