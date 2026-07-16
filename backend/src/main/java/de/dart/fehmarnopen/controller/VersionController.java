package de.dart.fehmarnopen.controller;

import java.time.Instant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.info.BuildProperties;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/version")
public class VersionController {

    @Nullable private final BuildProperties buildProperties;

    public VersionController(@Autowired(required = false) @Nullable BuildProperties buildProperties) {
        this.buildProperties = buildProperties;
    }

    @GetMapping
    public VersionResponse version() {
        if (buildProperties == null) {
            return new VersionResponse("dev", null);
        }
        Instant time = buildProperties.getTime();
        String buildTime = time != null ? time.toString() : null;
        return new VersionResponse(buildProperties.getVersion(), buildTime);
    }

    public record VersionResponse(String version, String buildTime) {}
}
