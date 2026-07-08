package de.dart.fehmarnopen.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.dart.fehmarnopen.config.TestSecurityConfig;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.DisziplinAnmeldung;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.exception.GlobalExceptionHandler;
import de.dart.fehmarnopen.service.AnmeldungService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

@WebMvcTest
@ContextConfiguration(classes = AnmeldungController.class)
@Import({GlobalExceptionHandler.class, TestSecurityConfig.class})
class AnmeldungControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JsonMapper jsonMapper;

    @MockitoBean
    private AnmeldungService anmeldungService;

    private SpielerRequest spielerRequest(String vorname) {
        return new SpielerRequest(vorname, "Mustermann", "RAD-1", null, null);
    }

    private Anmeldung buildAnmeldung(Disziplin disziplin, String teamName, String... vornamen) {
        Anmeldung a = new Anmeldung();
        a.setDisziplin(disziplin);
        a.setTeamName(teamName);
        a.setSpieler(List.of(vornamen).stream()
                .map(v -> {
                    Spieler s = new Spieler();
                    s.setVorname(v);
                    s.setNachname("Mustermann");
                    s.setRadicalId("RAD-1");
                    return s;
                })
                .toList());
        return a;
    }

    @Test
    void postAnmeldung_mitGueltigemRequest_sollAnmeldungMitSpielernZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(
                List.of(new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spielerRequest("Max")))));

        when(anmeldungService.anmelden(any())).thenReturn(List.of(buildAnmeldung(Disziplin.HERRENEINZEL, null, "Max")));

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.anmeldungen.length()").value(1))
                .andExpect(jsonPath("$.anmeldungen[0].disziplin").value("HERRENEINZEL"))
                .andExpect(jsonPath("$.anmeldungen[0].spieler[0].vorname").value("Max"))
                .andExpect(jsonPath("$.anmeldungen[0].abmeldetoken").doesNotExist());
    }

    @Test
    void postAnmeldung_mitTeamDisziplin_sollTeamNameUndSpielerZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(List.of(new DisziplinAnmeldung(
                Disziplin.HERRENDOPPEL, "Team Fehmarn", List.of(spielerRequest("Max"), spielerRequest("Tim")))));

        when(anmeldungService.anmelden(any()))
                .thenReturn(List.of(buildAnmeldung(Disziplin.HERRENDOPPEL, "Team Fehmarn", "Max", "Tim")));

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.anmeldungen[0].teamName").value("Team Fehmarn"))
                .andExpect(jsonPath("$.anmeldungen[0].spieler.length()").value(2));
    }

    @Test
    void postAnmeldung_ohneDisziplinen_sollBadRequestZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(List.of());

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postAnmeldung_mitDisziplinOhneSpieler_sollBadRequestZurueckgeben() throws Exception {
        AnmeldungRequest request =
                new AnmeldungRequest(List.of(new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of())));

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postAnmeldung_mitSpielerOhneVorname_sollBadRequestZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(List.of(new DisziplinAnmeldung(
                Disziplin.HERRENEINZEL, null, List.of(new SpielerRequest("", "Mustermann", "RAD-1", null, null)))));

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postAnmeldung_beiDoppelterDisziplin_sollConflictZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(List.of(
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spielerRequest("Max"))),
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spielerRequest("Tim")))));

        when(anmeldungService.anmelden(any())).thenThrow(new DoppelteAnmeldungException("HERRENEINZEL"));

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Bereits für Disziplin angemeldet: HERRENEINZEL"));
    }

    @Test
    void postAnmeldung_ohneBody_sollBadRequestZurueckgeben() throws Exception {
        mockMvc.perform(post("/api/anmeldung").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }
}
