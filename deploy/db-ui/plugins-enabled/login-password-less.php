<?php
// Adminer verweigert bei SQLite sonst JEDEN Login (mit UND ohne Passwort). Das
// Plugin ist bereits im Image enthalten; dieser Wrapper aktiviert es mit einem
// Gate-Passwort (docs/deployment.md -> "DB-UI (Adminer via SSH-Tunnel)").
//
// Hash VOR dem ersten Start ersetzen:
//   docker run --rm adminer:5 php -r "echo password_hash('IHR-PASSWORT', PASSWORD_DEFAULT);"
require_once('plugins/login-password-less.php');
return new AdminerLoginPasswordLess('<bcrypt-hash-hier-einsetzen>');
