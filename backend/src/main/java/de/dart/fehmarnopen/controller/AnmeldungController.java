package de.dart.fehmarnopen.controller;

import de.dart.fehmarnopen.dto.AnmeldeschlussStatusResponse;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungResponse;
import de.dart.fehmarnopen.service.AnmeldeschlussService;
import de.dart.fehmarnopen.service.AnmeldungService;
import de.dart.fehmarnopen.service.TeamlimitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/anmeldung")
@RequiredArgsConstructor
public class AnmeldungController {

    private final AnmeldungService anmeldungService;
    private final AnmeldeschlussService anmeldeschlussService;
    private final TeamlimitService teamlimitService;

    @PostMapping
    public ResponseEntity<AnmeldungResponse> anmelden(@Valid @RequestBody AnmeldungRequest request) {
        var anmeldungen = anmeldungService.anmelden(request);
        return ResponseEntity.ok(AnmeldungResponse.from(anmeldungen));
    }

    @GetMapping("/status")
    public AnmeldeschlussStatusResponse status() {
        return new AnmeldeschlussStatusResponse(
                anmeldeschlussService.anmeldungOffen(),
                anmeldeschlussService.anmeldeschluss(),
                teamlimitService.istAusgebucht(),
                teamlimitService.maxTeams());
    }
}
