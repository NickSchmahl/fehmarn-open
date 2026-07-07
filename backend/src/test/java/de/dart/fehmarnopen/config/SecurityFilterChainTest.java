package de.dart.fehmarnopen.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityFilterChainTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void adminRoute_withMalformedToken_shouldReturn401() throws Exception {
        mockMvc.perform(get("/api/admin/teilnehmer")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer das.ist.kein.gueltiger.token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void preflightRequest_shouldReturnCorsHeaders() throws Exception {
        mockMvc.perform(options("/api/admin/teilnehmer")
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200"))
                .andExpect(header().exists(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS));
    }

    @Test
    void anmeldung_withoutToken_shouldNotReturn401() throws Exception {
        mockMvc.perform(post("/api/anmeldung")).andExpect(status().isBadRequest());
    }

    @Test
    void teilnehmer_withoutToken_shouldNotReturn401() throws Exception {
        mockMvc.perform(get("/api/teilnehmer")).andExpect(status().isOk());
    }

    @Test
    void flyer_withoutToken_shouldNotReturn401() throws Exception {
        mockMvc.perform(get("/api/flyer")).andExpect(status().isNotFound());
    }
}
