package de.dart.fehmarnopen.controller;

import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.service.AnmeldungService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teilnehmer")
@RequiredArgsConstructor
public class TeilnehmerController {

    private final AnmeldungService anmeldungService;

    @GetMapping
    public TeilnehmerUebersichtResponse uebersicht() {
        return anmeldungService.oeffentlicheUebersicht();
    }
}
