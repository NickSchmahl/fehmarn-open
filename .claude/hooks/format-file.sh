#!/usr/bin/env bash
# format-file.sh – PostToolUse-Hook für Edit/Write/MultiEdit.
#
# Formatiert eine gerade geschriebene Frontend-Datei sofort mit Prettier, statt dass erst
# `npm run format:check` im Gate rot wird und das Gate komplett neu laufen muss.
# Begründung: docs/adr/0015-claude-harness-im-repo.md (Nachtrag).
#
# Bewusst nur Frontend: Prettier formatiert eine Datei in Millisekunden. Spotless für eine
# einzelne Java-Datei kostet einen Maven-Start (Sekunden pro Edit) – das übernimmt
# `spotless:apply` als erster Schritt des Gates.
#
# Greift nicht bei Dateien, die per Bash (sed, Heredoc, Skript) geschrieben werden – deshalb
# die Regel in .claude/rules/frontend.md, Code mit Edit/Write zu ändern.
#
# Eingabe: PostToolUse-JSON auf stdin. Exit-Code immer 0 – Formatieren darf nie blockieren.

set -uo pipefail

eingabe=$(cat)

if command -v jq >/dev/null 2>&1; then
  datei=$(printf '%s' "$eingabe" | jq -r '.tool_input.file_path // ""')
elif command -v python3 >/dev/null 2>&1; then
  datei=$(printf '%s' "$eingabe" | python3 -c \
    'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))')
else
  exit 0
fi

[ -n "$datei" ] && [ -f "$datei" ] || exit 0

projekt="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
frontend="$projekt/frontend"

# Nur Dateien unter frontend/ mit den Endungen aus `npm run format`.
case "$datei" in
  "$frontend"/*) ;;
  *) exit 0 ;;
esac
case "$datei" in
  *.ts | *.html | *.scss | *.css | *.json | *.js) ;;
  *) exit 0 ;;
esac

prettier="$frontend/node_modules/.bin/prettier"
[ -x "$prettier" ] || exit 0

# --ignore-unknown + .prettierignore (cwd = frontend) halten dist/, package-lock.json usw. raus.
cd "$frontend" && "$prettier" --write --ignore-unknown --log-level=warn "$datei" >/dev/null 2>&1
exit 0
