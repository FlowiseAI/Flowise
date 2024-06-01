#!/bin/sh
docker build -t answers-flowise . &&
  docker tag answers-flowise:latest theanswerai/flowise:latest &&
  docker push theanswerai/flowise:latest
