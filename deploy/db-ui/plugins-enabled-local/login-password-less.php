<?php
require_once('plugins/login-password-less.php');
// NUR fuer den lokalen Testaufbau: Gate-Passwort ist "local-test" (siehe deployment.md).
return new AdminerLoginPasswordLess('$2y$12$b9lAzdksF5uoLfdMYGcXHebNrVjNOHCf.X3v/mXCFoTMUT5ng2uMW');
