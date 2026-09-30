package de.dart.fehmarnopen.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SpaFallbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // Alle Top-Level-Routen aus frontend/src/app/app.routes.ts
    @ParameterizedTest
    @ValueSource(strings = {"/anmeldung", "/teilnehmer", "/flyer", "/impressum", "/datenschutz"})
    void angularRouteWirdAufIndexWeitergeleitet(String route) throws Exception {
        mockMvc.perform(get(route)).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void adminRouteWirdAufIndexWeitergeleitet() throws Exception {
        mockMvc.perform(get("/admin/login")).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void apiRouteWirdNichtAufIndexWeitergeleitet() throws Exception {
        // /api/teilnehmer ist permitAll und liefert echtes JSON, kein Forward auf index.html
        mockMvc.perform(get("/api/teilnehmer")).andExpect(status().isOk());
    }
}
