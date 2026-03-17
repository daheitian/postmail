#!/bin/sh
set -eu

node bin/jant.js migrate
exec node bin/jant.js start
