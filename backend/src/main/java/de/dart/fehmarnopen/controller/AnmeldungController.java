package de.dart.fehmarnopen.controller;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungResponse;
import de.dart.fehmarnopen.service.AnmeldungService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/anmeldung")
@RequiredArgsConstructor
public class AnmeldungController {

    private final AnmeldungService anmeldungService;

    @PostMapping
    public ResponseEntity<AnmeldungResponse> anmelden(@Valid @RequestBody AnmeldungRequest request) {
        var anmeldungen = anmeldungService.anmeldenMitTeilnehmer(request);
        return ResponseEntity.ok(AnmeldungResponse.from(anmeldungen));
    }
}
