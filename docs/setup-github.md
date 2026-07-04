# Setup: GitHub-Zugang für den KI-Assistenten

Damit der Assistent Branches pushen und PRs/Issues anlegen kann, braucht seine
Shell Zugriff auf GitHub. Der Weg hängt davon ab, welche Umgebung genutzt wird.

## Standard: Claude Code (läuft direkt auf Nicks Maschine) — empfohlen

Hier nutzt der Assistent die **bereits auf der Maschine eingerichtete** Anmeldung.
Kein Token muss in die Konversation eingegeben werden.

Einmalig einrichten:

```bash
gh auth login          # Browser-Flow oder Token einmalig eingeben
gh auth status         # prüfen
```

Das Credential liegt danach dauerhaft im System (gh-Config / Keychain). Der
Assistent führt nur noch Commands wie `gh pr create`, `gh issue list`, `git push`
aus – die Authentifizierung greift automatisch im Hintergrund.

- Fürs reine **Pushen** reicht sogar ein normal eingerichtetes Git (SSH-Key oder
  Credential-Helper) – dann braucht es `gh` gar nicht.
- Für **PRs/Issues anlegen** wird `gh` benötigt.

## Fallback: Cowork (isolierte Sandbox, startet pro Session neu)

Da die Sandbox keine dauerhafte Anmeldung speichert, wird hier pro Session ein
Token als Umgebungsvariable bereitgestellt und **nie in eine Datei geschrieben**.

## Einmalig: Fine-grained Personal Access Token erstellen

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → *Generate new token*.
2. **Repository access:** nur `NickSchmahl/fehmarn-open`.
3. **Permissions** (Repository):
   - Contents: **Read and write** (push)
   - Pull requests: **Read and write**
   - Issues: **Read and write**
   - Metadata: Read (automatisch)
4. Ablaufdatum kurz halten (z.B. 2–4 Wochen für die Projektphase).
5. Token kopieren und sicher ablegen (Passwortmanager).

## Pro Session: Token bereitstellen

Gib dem Assistenten das Token zu Session-Beginn. Er nutzt es nur als
Umgebungsvariable, z.B.:

```bash
export GH_TOKEN=github_pat_xxx     # nur im Speicher, nicht in Dateien
gh auth status
```

Danach kann er `gh pr create`, `gh issue list` etc. ausführen und pushen.

## Sicherheit

- Token niemals in Commits, `docs/`, oder andere Dateien schreiben.
- Bei Verdacht auf Leak: Token in GitHub sofort widerrufen (revoke).
- Nach der Projektphase Token löschen.
