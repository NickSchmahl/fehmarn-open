--liquibase formatted sql

--changeset fehmarnopen:001-init splitStatements:true endDelimiter:;
--comment: Baseline aus dem Hibernate-generierten Schema (SQLite). Auf bestehenden DBs per Precondition als bereits angewendet markiert (Adoption ohne Reset, siehe ADR 0009).
--preconditions onFail:MARK_RAN onError:HALT
--precondition-sql-check expectedResult:0 SELECT count(*) FROM sqlite_master WHERE type='table' AND name='anmeldung'
create table admin_user (
    id integer,
    benutzername varchar(255) not null unique,
    passwort_hash varchar(255) not null,
    primary key (id)
);

create table anmeldung (
    abgemeldet boolean not null,
    anwesend boolean not null,
    abgemeldet_am timestamp,
    angemeldet_am timestamp,
    id integer,
    disziplin varchar(255) not null check ((disziplin in ('HERRENEINZEL','DAMENEINZEL','HERRENDOPPEL','DAMENDOPPEL','TRIPLE_MIX','TEAMWETTBEWERB'))),
    team_name varchar(255),
    primary key (id)
);

create table spieler (
    geburtsdatum date,
    anmeldung_id bigint not null,
    id integer,
    initialen varchar(255),
    nachname varchar(255) not null,
    radikal_id varchar(255),
    vorname varchar(255) not null,
    primary key (id)
);

create table turnier_config (
    anmeldung_gesperrt boolean not null,
    anmeldeschluss_datum timestamp,
    id integer,
    primary key (id)
);
