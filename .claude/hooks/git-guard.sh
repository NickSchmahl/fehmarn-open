#!/usr/bin/env bash
# git-guard.sh – PreToolUse-Hook fuer den Bash-Tool.
#
# Setzt die Verbotsliste aus docs/workflow.md ("Was der Assistent NICHT tut") technisch
# durch. Begruendung: siehe docs/adr/0015-claude-harness-im-repo.md. CLAUDE.md ist Kontext
# und damit unverbindlich – dieser Hook laeuft, egal was das Modell sich vornimmt.
#
# Bewusst NICHT geblockt: `git rebase`. Schaden entsteht erst in Kombination mit einem
# Force-Push, und der ist unten dicht. Ein Blanket-Deny auf rebase wuerde nur nerven.
#
# Eingabe: PreToolUse-JSON auf stdin. Ausgabe: leer (= durchlassen) oder deny-JSON.
# Exit-Code bleibt immer 0; die Entscheidung transportiert das JSON.

set -uo pipefail

eingabe=$(cat)

# Kommando aus dem JSON ziehen. jq bevorzugt, python3 als Rueckfall. Fehlt beides,
# laesst der Hook durch statt jede Bash-Nutzung lahmzulegen – und sagt das laut.
if command -v jq >/dev/null 2>&1; then
  kommando=$(printf '%s' "$eingabe" | jq -r '.tool_input.command // ""')
elif command -v python3 >/dev/null 2>&1; then
  kommando=$(printf '%s' "$eingabe" | python3 -c \
    'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))')
else
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"git-guard.sh uebersprungen: weder jq noch python3 gefunden. Die Git-Regeln aus docs/workflow.md gelten trotzdem – bitte selbst einhalten."}}'
  exit 0
fi

[ -z "$kommando" ] && exit 0

# Nur Git-Kommandos interessieren.
case "$kommando" in
  *git*) ;;
  *) exit 0 ;;
esac

verweigern() {
  local grund="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg g "$grund" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$g}}'
  else
    python3 -c 'import json,sys; print(json.dumps({"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":sys.argv[1]}}))' "$grund"
  fi
  exit 0
}

# --- 1. Historie umschreiben ------------------------------------------------------------
if printf '%s' "$kommando" | grep -qE '\bgit\b[^|;&]*\bcommit\b[^|;&]*--amend'; then
  verweigern "Blockiert durch .claude/hooks/git-guard.sh: kein 'git commit --amend'. Historie, auf die GitHub/andere schon zugreifen, wird nicht umgeschrieben (docs/workflow.md). Korrektur als ZUSAETZLICHER neuer Commit obendrauf."
fi

if printf '%s' "$kommando" | grep -qE '\bgit\b[^|;&]*\bpush\b[^|;&]*(--force-with-lease|--force|[[:space:]]-f([[:space:]]|$))'; then
  verweigern "Blockiert durch .claude/hooks/git-guard.sh: kein Force-Push – auch nicht --force-with-lease (docs/workflow.md). Merge-Konflikte werden mit 'git merge origin/main' im Branch geloest, nicht per Rebase + Force-Push."
fi

# --- 2. Pauschales Stagen ---------------------------------------------------------------
if printf '%s' "$kommando" | grep -qE '\bgit\b[^|;&]*\badd\b[^|;&]*([[:space:]]-A([[:space:]]|$)|[[:space:]]--all([[:space:]]|$)|[[:space:]]\.([[:space:]]|$))'; then
  verweigern "Blockiert durch .claude/hooks/git-guard.sh: kein 'git add -A' / 'git add .' (docs/workflow.md). Nur bewusst gewaehlte Dateien stagen: 'git add <pfad>' – sonst geraten fremde Dateien in den Commit."
fi

# --- 3. Datenbank ------------------------------------------------------------------------
if printf '%s' "$kommando" | grep -qE '\bgit\b[^|;&]*\badd\b[^|;&]*\.db([[:space:]]|$)'; then
  verweigern "Blockiert durch .claude/hooks/git-guard.sh: SQLite-Datenbanken (*.db) werden nie committet (docs/workflow.md, AGENTS.md)."
fi

if printf '%s' "$kommando" | grep -qE '\bgit\b[^|;&]*\bcommit\b'; then
  if git diff --cached --name-only 2>/dev/null | grep -qE '\.db$'; then
    verweigern "Blockiert durch .claude/hooks/git-guard.sh: es liegt eine *.db-Datei im Stage. Datenbanken werden nie committet. Erst 'git restore --staged <datei>', dann erneut committen."
  fi
fi

# --- 4. main ist tabu --------------------------------------------------------------------
aktueller_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [ "$aktueller_branch" = "main" ] && printf '%s' "$kommando" | grep -qE '\bgit\b[^|;&]*\bcommit\b'; then
  verweigern "Blockiert durch .claude/hooks/git-guard.sh: keine Direktcommits auf 'main' (docs/workflow.md). Erst einen Feature-Branch anlegen: 'git switch -c feat/<nr>-kurzbeschreibung'."
fi

if printf '%s' "$kommando" | grep -qE '\bgit\b[^|;&]*\bpush\b[^|;&]*[[:space:]]main([[:space:]]|$)'; then
  verweigern "Blockiert durch .claude/hooks/git-guard.sh: kein Push auf 'main' (docs/workflow.md). Aenderungen kommen ausschliesslich per PR nach main."
fi

exit 0
