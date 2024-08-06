#!/bin/bash

export PERL5LIB=/home/production/perl5/lib/perl5

cd /home/production/CRISPGET

mkdir /tmp/crispget

screen perl script/crispget_server.pl -r --fork
