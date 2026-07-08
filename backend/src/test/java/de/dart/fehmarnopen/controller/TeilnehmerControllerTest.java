package de.dart.fehmarnopen.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.dart.fehmarnopen.config.TestSecurityConfig;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.DisziplinGruppe;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.TeilnehmerEintrag;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.GlobalExceptionHandler;
import de.dart.fehmarnopen.service.AnmeldungService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest
@ContextConfiguration(classes = TeilnehmerController.class)
@Import({GlobalExceptionHandler.class, TestSecurityConfig.class})
class TeilnehmerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnmeldungService anmeldungService;

    @Test
    void getTeilnehmer_sollGruppierteUebersichtZurueckgeben() throws Exception {
        when(anmeldungService.oeffentlicheUebersicht())
                .thenReturn(new TeilnehmerUebersichtResponse(List.of(new DisziplinGruppe(
                        Disziplin.HERRENDOPPEL,
                        1,
                        List.of(new TeilnehmerEintrag("Max", "Mustermann", "Die Bullseye Boys"))))));

        mockMvc.perform(get("/api/teilnehmer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disziplinen").isArray())
                .andExpect(jsonPath("$.disziplinen[0].disziplin").value("HERRENDOPPEL"))
                .andExpect(jsonPath("$.disziplinen[0].anzahl").value(1))
                .andExpect(jsonPath("$.disziplinen[0].teilnehmer[0].vorname").value("Max"))
                .andExpect(jsonPath("$.disziplinen[0].teilnehmer[0].teamName").value("Die Bullseye Boys"));
    }

    @Test
    void getTeilnehmer_sollKeineSensiblenFelderEnthalten() throws Exception {
        when(anmeldungService.oeffentlicheUebersicht())
                .thenReturn(new TeilnehmerUebersichtResponse(List.of(new DisziplinGruppe(
                        Disziplin.HERRENEINZEL, 1, List.of(new TeilnehmerEintrag("Max", "Mustermann", null))))));

        mockMvc.perform(get("/api/teilnehmer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disziplinen[0].teilnehmer[0].email").doesNotExist())
                .andExpect(jsonPath("$.disziplinen[0].teilnehmer[0].radikalId").doesNotExist());
    }

    @Test
    void getTeilnehmer_ohneAnmeldungen_sollLeereListeZurueckgeben() throws Exception {
        when(anmeldungService.oeffentlicheUebersicht()).thenReturn(new TeilnehmerUebersichtResponse(List.of()));

        mockMvc.perform(get("/api/teilnehmer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disziplinen").isEmpty());
    }
}
