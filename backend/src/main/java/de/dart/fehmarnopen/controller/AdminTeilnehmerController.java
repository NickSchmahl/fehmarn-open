package de.dart.fehmarnopen.controller;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.service.AnmeldungService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminTeilnehmerController {

    private final AnmeldungService anmeldungService;

    @GetMapping("/teilnehmer")
    public AdminUebersichtResponse teilnehmer() {
        return anmeldungService.adminUebersicht();
    }

    @PostMapping("/anmeldung/{id}/abmelden")
    public ResponseEntity<Void> abmelden(@PathVariable Long id) {
        anmeldungService.abmelden(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/anmeldung/{id}/reaktivieren")
    public ResponseEntity<Void> reaktivieren(@PathVariable Long id) {
        anmeldungService.reaktivieren(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/anmeldung/{id}/anwesenheit")
    public ResponseEntity<Void> anwesenheit(@PathVariable Long id, @RequestBody AnwesenheitRequest request) {
        anmeldungService.setAnwesenheit(id, request.anwesend());
        return ResponseEntity.ok().build();
    }

    public record AnwesenheitRequest(boolean anwesend) {}
}
