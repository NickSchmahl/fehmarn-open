--liquibase formatted sql

--changeset fehmarnopen:002-add-u18-disziplin splitStatements:true endDelimiter:;
--comment: Ergänzt die Disziplin U18 in der CHECK-Constraint der Tabelle anmeldung (Flyer 2027, #151). SQLite kann einen CHECK-Constraint nicht per ALTER ändern → Tabellen-Rebuild: neue Tabelle mit erweitertem CHECK, Daten kopieren, alte Tabelle droppen, umbenennen. Siehe docs/datenbank-schema-aendern.md und ADR 0009. Bestehende Werte sind eine Teilmenge des neuen CHECK, bleiben also gültig.
create table anmeldung_neu (
    abgemeldet boolean not null,
    anwesend boolean not null,
    abgemeldet_am timestamp,
    angemeldet_am timestamp,
    id integer,
    disziplin varchar(255) not null check ((disziplin in ('TEAMWETTBEWERB','HERRENEINZEL','DAMENEINZEL','U18','TRIPLE_MIX','HERRENDOPPEL','DAMENDOPPEL'))),
    team_name varchar(255),
    primary key (id)
);

insert into anmeldung_neu (abgemeldet, anwesend, abgemeldet_am, angemeldet_am, id, disziplin, team_name)
    select abgemeldet, anwesend, abgemeldet_am, angemeldet_am, id, disziplin, team_name from anmeldung;

drop table anmeldung;

alter table anmeldung_neu rename to anmeldung;
