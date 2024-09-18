use strict;
use warnings;

use CRISPGET;

my $app = CRISPGET->apply_default_middlewares(CRISPGET->psgi_app);
$app;

