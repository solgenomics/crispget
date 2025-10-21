#!/bin/bash

cd /home/CRISPGET

mkdir /tmp/crispget

export CRISPGET_home=/home/CRISPGET

perl script/crispget_server.pl --fork -d -r -p 8080 2> /var/log/crispget.log


tail -f /home/CRISPGET/crispget_local.conf
