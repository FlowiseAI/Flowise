<!-- markdownlint-disable MD030 -->

<p align="center">
<img src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_white.svg#gh-light-mode-only">
<img src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_dark.svg#gh-dark-mode-only">
</p>

<div align="center">

[![Release Notes](https://img.shields.io/github/release/FlowiseAI/Flowise)](https://github.com/FlowiseAI/Flowise/releases)
[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter Follow](https://img.shields.io/twitter/follow/FlowiseAI?style=social)](https://twitter.com/FlowiseAI)
[![GitHub star chart](https://img.shields.io/github/stars/FlowiseAI/Flowise?style=social)](https://star-history.com/#FlowiseAI/Flowise)
[![GitHub fork](https://img.shields.io/github/forks/FlowiseAI/Flowise?style=social)](https://github.com/FlowiseAI/Flowise/fork)

English | [繁體中文](./i18n/README-TW.md) | [简体中文](./i18n/README-ZH.md) | [日本語](./i18n/README-JA.md) | [한국어](./i18n/README-KR.md)

</div>

<h3>AI Agents चे व्हिज्युअल बिल्डिंग</h3>
<a href="https://github.com/FlowiseAI/Flowise">
<img width="100%" src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_agentflow.gif?raw=true"></a>

## 📚 विषय सूची

- [⚡ जलद सुरुवात](#-जलद-सुरुवात)
- [🐳 Docker](#-docker)
- [👨‍💻 डेव्हलपर्स](#-डेव्हलपर्स)
- [🌱 Env Variables](#-env-variables)
- [📖 दस्तऐवजीकरण](#-दस्तऐवजीकरण)
- [🌐 स्वयं-होस्ट](#-स्वयं-होस्ट)
- [☁️ Flowise Cloud](#️-flowise-cloud)
- [🙋 मदत](#-मदत)
- [🙌 योगदान](#-योगदान)
- [📄 परवाना](#-परवाना)

## ⚡ जलद सुरुवात

[NodeJS](https://nodejs.org/en/download) >= 18.15.0 डाउनलोड आणि इन्स्टॉल करा.

1. **Flowise इन्स्टॉल करा**
    ```bash
    npm install -g flowise
    ```

2. **Flowise सुरू करा**
    ```bash
    npx flowise start
    ```

3. **ब्राऊझर उघडा:**  
   [http://localhost:3000](http://localhost:3000)

---

## 🐳 Docker

### Docker Compose

1. Flowise प्रोजेक्ट क्लोन करा  
2. root मधील `docker` फोल्डरमध्ये जा  
3. `.env.example` कॉपी करून `.env` नाव द्या  
4. कंटेनर सुरू करा:
    ```bash
    docker compose up -d
    ```
5. उघडा: [http://localhost:3000](http://localhost:3000)  
6. थांबवण्यासाठी:
    ```bash
    docker compose stop
    ```

### Docker Image

1. इमेज तयार करा:
    ```bash
    docker build --no-cache -t flowise .
    ```

2. Run:
    ```bash
    docker run -d --name flowise -p 3000:3000 flowise
    ```

3. Stop:
    ```bash
    docker stop flowise
    ```

---

## 👨‍💻 डेव्हलपर्स

Flowise मोनो रिपॉझिटरीमध्ये 4 मॉड्यूल आहेत:

- `server`: Node.js backend  
- `ui`: React frontend  
- `components`: तृतीय-पक्ष इंटिग्रेशन नोड्स  
- `api-documentation`: swagger API docs  

### पूर्वअट

PNPM इन्स्टॉल करा:
```bash
npm i -g pnpm
```

### सेटअप

1. रिपॉझिटरी क्लोन करा:

    ```bash
    git clone https://github.com/FlowiseAI/Flowise.git
    ```

2. डिरेक्टरीमध्ये जा:

    ```bash
    cd Flowise
    ```

3. सर्व dependencies इन्स्टॉल:
    ```bash
    pnpm install
    ```

4. Build:
    ```bash
    pnpm build
    ```

    #### ❗ Exit code 134 (JS heap out of memory)
    ```bash
    export NODE_OPTIONS="--max-old-space-size=4096"
    pnpm build
    ```

5. अॅप सुरू करा:
    ```bash
    pnpm start
    ```

6. Development मोड:

    - `packages/ui` मध्ये `.env` तयार करा ⇒ `VITE_PORT`
    - `packages/server` मध्ये `.env` ⇒ `PORT`

    Run:
    ```bash
    pnpm dev
    ```

Dev मोड ऍक्सेस:  
**http://localhost:8080**

---

## 🌱 Env Variables

Flowise instance configure करण्यासाठी `.env` मध्ये environment variables वापरा.  
पूर्ण यादीसाठी “CONTRIBUTING.md” पहा.

---

## 📖 दस्तऐवजीकरण

Flowise Docs येथे उपलब्ध:  
👉 **https://docs.flowiseai.com/**

---

## 🌐 स्वयं-होस्ट

Flowise तुमच्या स्वतःच्या सर्व्हर किंवा क्लाऊडवर सहज होस्ट करता येतो.  
आम्ही खालील डिप्लॉयमेंट्स सपोर्ट करतो:

- AWS  
- Azure  
- Digital Ocean  
- GCP  
- Alibaba Cloud  

अतिरिक्त:

- Railway  
- Northflank  
- Render  
- HuggingFace Spaces  
- Elestio  
- Sealos  
- RepoCloud  

---

## ☁️ Flowise Cloud

Flowise Cloud वर सुरू करा:  
👉 https://flowiseai.com/

---

## 🙋 मदत

प्रश्न, समस्या किंवा फिचर विनंत्यांसाठी Discussions वापरा:  
👉 https://github.com/FlowiseAI/Flowise/discussions

---

## 🙌 योगदान

Flowise contributors चे मनापासून आभार!

Contributing Guide: `CONTRIBUTING.md`  
Discord: https://discord.gg/jbaHfsRVBW

---

## 📄 परवाना

Flowise हा **Apache License 2.0** अंतर्गत उपलब्ध आहे.