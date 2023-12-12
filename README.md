# STARTAI

## запуск проекта

### - yarn install

### - yarn build

### - yarn start

## PM2

## Имена и порты

### имена редактируются в файлах STARTAI\_'ONE-FIVE'\_ecosystem.config.js

### порты PORT=3000 PORT_ONE=3021 PORT_TWO=3022 PORT_THREE=3023 PORT_FOUR=3024 PORT_FIVE=3025 редактировать порты в packages\server\.env

### Порт выбирается в зависимости от NODE_ENV название которого ровно имени STARTAI\_'ONE-FIVE'\_, для добавления нового или изенения порта нужно отредактировать файл packages\server\src\index.ts в котором используется функция запуска приложения на нужном порте

```
switch (process.env.NODE_ENV) {
        case 'STARTAI_DEFAULT':
            port = parseInt(process.env.PORT || '', 10) || 3000
            break
        case 'STARTAI_ONE':
            port = parseInt(process.env.PORT_ONE || '', 10) || 3021
            break
        case 'STARTAI_TWO':
            port = parseInt(process.env.PORT_TWO || '', 10) || 3022
            break
        case 'STARTAI_THREE':
            port = parseInt(process.env.PORT_THREE || '', 10) || 3023
            break
        case 'STARTAI_FOUR':
            port = parseInt(process.env.PORT_FOUR || '', 10) || 3024
            break
        case 'STARTAI_FIVE':
            port = parseInt(process.env.PORT_FIVE || '', 10) || 3025
            break
        default:
}
```

### - yarn install

### - yarn build

### - pm2 start

### - pm2 start STARTAI_ONE_ecosystem.config.js

### - pm2 start STARTAI_TWO_ecosystem.config.js

### - pm2 start STARTAI_THREE_ecosystem.config.js

### - pm2 start STARTAI_FOUR_ecosystem.config.js

### - pm2 start STARTAI_FIVE_ecosystem.config.js
