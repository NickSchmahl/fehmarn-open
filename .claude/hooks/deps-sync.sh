#!/usr/bin/env bash
# deps-sync.sh – SessionStart-Hook und Vorstufe von /quality-gate.
#
# Hält frontend/node_modules passend zu frontend/package-lock.json. Anlass: Nach einem
# Merge, der eine Abhängigkeit hinzufügt (z. B. eslint-plugin-boundaries in #320), lief
# das Gate gegen veraltete node_modules – ESLint brach mit "Cannot find module" ab, und
# erst danach kam `npm ci`. Begründung: docs/adr/0015-claude-harness-im-repo.md (Nachtrag).
#
# Ablauf:
#   - Fingerabdruck = SHA-256 von package-lock.json, abgelegt in node_modules/.lock-sha256.
#   - Stimmt er, passiert nichts (Millisekunden).
#   - Fehlt er, aber `npm ls` ist sauber: nur Fingerabdruck schreiben (kein unnötiges npm ci).
#   - Sonst: `npm ci`.
# Das Backend braucht nichts dergleichen: Maven lädt fehlende Abhängigkeiten selbst nach.
#
# Ausgabe: eine Zeile für Claude/den Menschen. Exit-Code immer 0 – ein Fehler hier soll die
# Session nicht blockieren; das Gate meldet ihn dann ohnehin.

set -uo pipefail

projekt="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
frontend="$projekt/frontend"
lock="$frontend/package-lock.json"
marke="$frontend/node_modules/.lock-sha256"

[ -f "$lock" ] || exit 0
command -v npm >/dev/null 2>&1 || { echo "deps-sync: npm nicht gefunden – frontend/node_modules ungeprüft."; exit 0; }

pruefsumme() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

soll=$(pruefsumme "$lock")
ist=$(cat "$marke" 2>/dev/null || true)

[ "$soll" = "$ist" ] && exit 0

cd "$frontend" || exit 0

# Erster Lauf auf einer bestehenden Installation: nicht blind neu installieren.
if [ -z "$ist" ] && [ -d node_modules ] && npm ls --depth=0 >/dev/null 2>&1; then
  printf '%s\n' "$soll" > "$marke"
  exit 0
fi

echo "deps-sync: frontend/node_modules passt nicht zu package-lock.json – npm ci läuft ..."
if npm ci --no-audit --no-fund >/tmp/deps-sync-npm-ci.log 2>&1; then
  printf '%s\n' "$soll" > "$marke"
  echo "deps-sync: npm ci fertig, Abhängigkeiten aktuell."
else
  echo "deps-sync: npm ci FEHLGESCHLAGEN (Log: /tmp/deps-sync-npm-ci.log). Vor dem Gate beheben."
fi
exit 0
