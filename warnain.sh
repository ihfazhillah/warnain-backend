#!/bin/bash

cd "$(dirname "$0")"

/home/Develops/venvs/warnain/bin/gunicorn --bind 0.0.0.0:9000 --workers 2 config.wsgi:application
