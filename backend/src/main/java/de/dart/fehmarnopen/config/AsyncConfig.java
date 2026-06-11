package de.dart.fehmarnopen.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Aktiviert @Async, damit der Mailversand (nach Commit) auf einem eigenen Thread läuft. */
@Configuration
@EnableAsync
public class AsyncConfig {}
