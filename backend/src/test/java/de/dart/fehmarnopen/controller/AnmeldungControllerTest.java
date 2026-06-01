package de.dart.fehmarnopen.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.dart.fehmarnopen.config.TestSecurityConfig;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Teilnehmer;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.exception.GlobalExceptionHandler;
import de.dart.fehmarnopen.service.AnmeldungService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
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

    private Teilnehmer teilnehmer;

    @BeforeEach
    void setUp() {
        teilnehmer = new Teilnehmer();
        teilnehmer.setVorname("Max");
        teilnehmer.setNachname("Mustermann");
        teilnehmer.setEmail("max@example.com");
    }

    private Anmeldung buildAnmeldung(Disziplin disziplin, String teamName) {
        Anmeldung a = new Anmeldung();
        a.setTeilnehmer(teilnehmer);
        a.setDisziplin(disziplin);
        a.setTeamName(teamName);
        return a;
    }

    @Test
    void postAnmeldung_mitGueltigemRequest_sollCreatedZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(
                "Max",
                "Mustermann",
                "max@example.com",
                "RAD-001",
                List.of(new AnmeldungRequest.DisziplinAnmeldung(Disziplin.HERRENEINZEL, null)));

        when(anmeldungService.anmeldenMitTeilnehmer(any()))
                .thenReturn(List.of(buildAnmeldung(Disziplin.HERRENEINZEL, null)));

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.anmeldungen").isArray())
                .andExpect(jsonPath("$.anmeldungen.length()").value(1))
                .andExpect(jsonPath("$.anmeldungen[0].disziplin").value("HERRENEINZEL"));
    }

    @Test
    void postAnmeldung_mitMehrerenDisziplinen_sollAlleZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(
                "Max",
                "Mustermann",
                "max@example.com",
                null,
                List.of(
                        new AnmeldungRequest.DisziplinAnmeldung(Disziplin.HERRENEINZEL, null),
                        new AnmeldungRequest.DisziplinAnmeldung(Disziplin.HERRENDOPPEL, "Team Fehmarn")));

        when(anmeldungService.anmeldenMitTeilnehmer(any()))
                .thenReturn(List.of(
                        buildAnmeldung(Disziplin.HERRENEINZEL, null),
                        buildAnmeldung(Disziplin.HERRENDOPPEL, "Team Fehmarn")));

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.anmeldungen.length()").value(2))
                .andExpect(jsonPath("$.anmeldungen[1].teamName").value("Team Fehmarn"));
    }

    @Test
    void postAnmeldung_ohneVorname_sollBadRequestZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(
                "",
                "Mustermann",
                "max@example.com",
                null,
                List.of(new AnmeldungRequest.DisziplinAnmeldung(Disziplin.HERRENEINZEL, null)));

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postAnmeldung_mitUngueltigerEmail_sollBadRequestZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(
                "Max",
                "Mustermann",
                "keine-email",
                null,
                List.of(new AnmeldungRequest.DisziplinAnmeldung(Disziplin.HERRENEINZEL, null)));

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postAnmeldung_ohneDisziplinen_sollBadRequestZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest("Max", "Mustermann", "max@example.com", null, List.of());

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postAnmeldung_beiDoppelterDisziplin_sollConflictZurueckgeben() throws Exception {
        AnmeldungRequest request = new AnmeldungRequest(
                "Max",
                "Mustermann",
                "max@example.com",
                null,
                List.of(
                        new AnmeldungRequest.DisziplinAnmeldung(Disziplin.HERRENEINZEL, null),
                        new AnmeldungRequest.DisziplinAnmeldung(Disziplin.HERRENEINZEL, null)));

        when(anmeldungService.anmeldenMitTeilnehmer(any())).thenThrow(new DoppelteAnmeldungException("HERRENEINZEL"));

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
