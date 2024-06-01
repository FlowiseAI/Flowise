#!/bin/sh
docker image prune -a -f && docker-compose pull
