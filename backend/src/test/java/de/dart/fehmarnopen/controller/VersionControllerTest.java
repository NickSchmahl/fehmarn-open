package de.dart.fehmarnopen.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.dart.fehmarnopen.config.TestSecurityConfig;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.info.BuildProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest
@ContextConfiguration(classes = VersionController.class)
@Import({TestSecurityConfig.class, VersionControllerTest.BuildInfoConfig.class})
class VersionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @TestConfiguration
    static class BuildInfoConfig {
        @Bean
        BuildProperties buildProperties() {
            Properties props = new Properties();
            props.setProperty("version", "1.2.3");
            props.setProperty("time", "1700000000000");
            return new BuildProperties(props);
        }
    }

    @Test
    void getVersion_sollGestempelteVersionOeffentlichZurueckgeben() throws Exception {
        mockMvc.perform(get("/api/version"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value("1.2.3"));
    }

    @Test
    void ohneBuildInfo_sollDevZurueckgeben() {
        VersionController controller = new VersionController(null);
        assertThat(controller.version().version()).isEqualTo("dev");
        assertThat(controller.version().buildTime()).isNull();
    }
}
