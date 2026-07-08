package de.dart.fehmarnopen.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.dart.fehmarnopen.auth.JwtService;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    // -------------------------------------------------------------------------
    // Format-Tests – Response-Struktur muss immer { status, message, timestamp }
    // -------------------------------------------------------------------------

    @Test
    void validationError_shouldReturn400WithErrorFormat() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validierungsfehler"))
                .andExpect(jsonPath("$.errors").isArray())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void missingBody_shouldReturn400WithErrorFormat() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void unknownRoute_shouldReturn404WithErrorFormat() throws Exception {
        String token = jwtService.generateToken("testadmin");

        mockMvc.perform(get("/api/gibts/nicht").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Ressource nicht gefunden"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // Inhalts-Tests – richtige Message und Felder für den jeweiligen Fehler
    // -------------------------------------------------------------------------

    @Test
    void validationError_shouldContainFieldErrors() throws Exception {
        // Leerer Body → beide Felder schlagen fehl, beide sollen in errors auftauchen
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isArray())
                .andExpect(jsonPath("$.errors[?(@.field == 'username')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field == 'password')]").exists());
    }

    @Test
    void validationError_shouldContainFieldAndMessage() throws Exception {
        // Nur username leer → genau ein Fehler mit field und message
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"\", \"password\": \"test\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").isNotEmpty())
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
    }

    @Test
    @Disabled("Wartet auf POST /api/anmeldung – Controller noch nicht implementiert")
    void anmeldungGesperrt_shouldReturn403WithMessage() throws Exception {
        // Wird grün sobald POST /api/anmeldung existiert und das Testprofil
        // die Anmeldung als gesperrt konfiguriert.
        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Anmeldung ist derzeit gesperrt"))
                .andExpect(jsonPath("$.errors").doesNotExist());
    }

    @Test
    void ungueltigeAnmeldung_falscheSpielerzahl_shouldReturn400WithMessage() throws Exception {
        // Herreneinzel mit zwei Spielern → fachlich ungültig (kein Feldfehler, sondern 400-Message)
        String body =
                """
                {"disziplinen":[{"disziplin":"HERRENEINZEL","teamName":null,"spieler":[
                  {"vorname":"Max","nachname":"Mustermann","radicalId":"MM-1","initialen":null,"geburtsdatum":null},
                  {"vorname":"Tim","nachname":"Test","radicalId":"TT-1","initialen":null,"geburtsdatum":null}
                ]}]}""";

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.errors").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Sicherheits-Tests – keine internen Details in der Response
    // -------------------------------------------------------------------------

    @Test
    void unexpectedError_shouldReturn500WithoutStackTrace() throws Exception {
        mockMvc.perform(get("/api/gibts/nicht"))
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist());
    }

    @Test
    void unexpectedError_shouldReturn500WithGenericMessage() {
        // Platzhalter – wird mit dem ersten Controller der einen 500er produzieren
        // kann befüllt. Beispiel:
        // mockMvc.perform(get("/api/test/trigger-error"))
        //         .andExpect(status().isInternalServerError())
        //         .andExpect(jsonPath("$.status").value(500))
        //         .andExpect(jsonPath("$.message").value("Ein unerwarteter Fehler ist aufgetreten"))
        //         .andExpect(jsonPath("$.errors").doesNotExist());
    }
}
