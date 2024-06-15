#!/bin/bash
# Criar o diretório onde a chave será armazenada
mkdir -p /opt/render/.flowise/

# Copiar o arquivo de chave de criptografia do repositório para o diretório apropriado
cp ./.flowise/encryption.key /opt/render/.flowise/encryption.key

# Comando para iniciar o Flowise (substitua pelo comando real de inicialização do Flowise)
npm start
