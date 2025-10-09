FROM flowiseai/flowise:latest
ENV PORT=10000
ENV NODE_OPTIONS="--max-old-space-size=450"
EXPOSE 10000
