#!/bin/bash
# Tornar o script executável
chmod +x ./start.sh

# Criar o diretório onde a chave será armazenada
mkdir -p /opt/render/.flowise/

# Copiar o arquivo de chave de criptografia do Secret File para o diretório apropriado
cp /etc/secrets/encryption_key /opt/render/.flowise/encryption.key

# Comando para iniciar o Flowise (substitua pelo comando real de inicialização do Flowise)
npm start
