# ADR 0006 – GitHub-Zusammenarbeit über gh CLI

**Status:** Akzeptiert · **Datum:** 2026-07-04

## Kontext
Der Assistent soll Branches pushen und PRs/Issues anlegen können, ohne Secrets in
Dateien oder Konversation zu hinterlassen.

## Entscheidung
Zusammenarbeit über die **gh CLI**. Bevorzugt in **Claude Code** direkt auf Nicks
Maschine mit einmalig per `gh auth login` eingerichteter Anmeldung (kein Token im
Chat). In isolierten Sandboxes (Cowork) als Fallback ein Fine-grained Token pro
Session als Env-Variable – **nie in Dateien**.

## Konsequenzen
- Kein dauerhafter PAT in Repo/Dateien (Sicherheit).
- Reibungsloses `gh pr create` / `git push` lokal.
- Details/Setup: [setup-github.md](../setup-github.md).

## Alternativen
- Dauerhafter PAT in Datei: **verworfen** aus Sicherheitsgründen.
