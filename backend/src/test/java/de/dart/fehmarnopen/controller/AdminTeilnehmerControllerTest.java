package de.dart.fehmarnopen.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.dart.fehmarnopen.config.TestSecurityConfig;
import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.AdminUebersichtResponse.DisziplinGruppe;
import de.dart.fehmarnopen.dto.AdminUebersichtResponse.MeldungEintrag;
import de.dart.fehmarnopen.dto.AdminUebersichtResponse.SpielerEintrag;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.GlobalExceptionHandler;
import de.dart.fehmarnopen.exception.NichtGefundenException;
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

@WebMvcTest
@ContextConfiguration(classes = AdminTeilnehmerController.class)
@Import({GlobalExceptionHandler.class, TestSecurityConfig.class})
class AdminTeilnehmerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnmeldungService anmeldungService;

    @Test
    void getTeilnehmer_sollMeldungMitStatusUndSpielernLiefern() throws Exception {
        when(anmeldungService.adminUebersicht())
                .thenReturn(new AdminUebersichtResponse(List.of(new DisziplinGruppe(
                        Disziplin.HERRENDOPPEL,
                        1,
                        List.of(new MeldungEintrag(
                                5L,
                                "Team A",
                                true,
                                false,
                                List.of(new SpielerEintrag("Max", "Mustermann", "MM-1", null, null))))))));

        mockMvc.perform(get("/api/admin/teilnehmer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disziplinen[0].disziplin").value("HERRENDOPPEL"))
                .andExpect(jsonPath("$.disziplinen[0].anzahl").value(1))
                .andExpect(jsonPath("$.disziplinen[0].meldungen[0].id").value(5))
                .andExpect(jsonPath("$.disziplinen[0].meldungen[0].anwesend").value(true))
                .andExpect(jsonPath("$.disziplinen[0].meldungen[0].abgemeldet").value(false))
                .andExpect(jsonPath("$.disziplinen[0].meldungen[0].spieler[0].vorname")
                        .value("Max"))
                .andExpect(jsonPath("$.disziplinen[0].meldungen[0].spieler[0].radikalId")
                        .value("MM-1"));
    }

    @Test
    void postAbmelden_sollServiceMitIdAufrufen() throws Exception {
        mockMvc.perform(post("/api/admin/anmeldung/5/abmelden")).andExpect(status().isOk());

        verify(anmeldungService).abmelden(5L);
    }

    @Test
    void postReaktivieren_sollServiceMitIdAufrufen() throws Exception {
        mockMvc.perform(post("/api/admin/anmeldung/5/reaktivieren")).andExpect(status().isOk());

        verify(anmeldungService).reaktivieren(5L);
    }

    @Test
    void putAnwesenheit_sollServiceMitWertAufrufen() throws Exception {
        mockMvc.perform(put("/api/admin/anmeldung/5/anwesenheit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"anwesend\": true}"))
                .andExpect(status().isOk());

        verify(anmeldungService).setAnwesenheit(5L, true);
    }

    @Test
    void postAbmelden_unbekannteId_sollNotFoundZurueckgeben() throws Exception {
        doThrow(new NichtGefundenException("Anmeldung nicht gefunden: 99"))
                .when(anmeldungService)
                .abmelden(eq(99L));

        mockMvc.perform(post("/api/admin/anmeldung/99/abmelden")).andExpect(status().isNotFound());
    }
}
