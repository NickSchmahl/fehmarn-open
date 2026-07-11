--liquibase formatted sql

--changeset fehmarnopen:003-drop-turnier-config
--comment: Entfernt die ungenutzte Tabelle turnier_config. Der Anmeldeschluss wird als Server-Config gesetzt (fehmarnopen.anmeldung.anmeldeschluss), nicht in der DB (#153, ADR 0013). SQLite erlaubt DROP TABLE ohne Rebuild.
drop table turnier_config;
