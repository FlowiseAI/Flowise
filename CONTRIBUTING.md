<!-- markdownlint-disable MD030 -->

# Flowise मध्ये योगदान देणे

English | [中文](./i18n/CONTRIBUTING-ZH.md)

आम्ही कोणत्याही स्वरूपातील योगदानांचे स्वागत करतो.

## ⭐ स्टार द्या

GitHub वरील Flowise रिपॉझिटरीला स्टार द्या आणि शेअर करा:  
https://github.com/FlowiseAI/Flowise

## 🙋 प्रश्न व उत्तरे

प्रश्न असल्यास सर्वप्रथम येथे शोधा:  
https://github.com/FlowiseAI/Flowise/discussions/categories/q-a

उत्तर न मिळाल्यास नवीन प्रश्न तयार करा — यामुळे इतरांनाही मदत होऊ शकते.

## 🙌 तुमचा Chatflow शेअर करा

होय! Flowise वापरण्याचा तुमचा मार्ग शेअर करणे म्हणजे एक महत्त्वाचे योगदान आहे.

- तुमचा Chatflow JSON म्हणून एक्सपोर्ट करा  
- स्क्रीनशॉट जोडा  
- “Show and Tell” मध्ये शेअर करा  

👉 https://github.com/FlowiseAI/Flowise/discussions/categories/show-and-tell

## 💡 नवीन कल्पना

नवीन फीचर्स, ऍप इंटिग्रेशन, ब्लॉकचेन नेटवर्क इत्यादी सर्व कल्पना स्वागतार्ह आहेत.

कल्पना सबमिट करा:  
👉 https://github.com/FlowiseAI/Flowise/discussions/categories/ideas

## 🐞 बग रिपोर्ट करा

एखादी समस्या आढळली? येथे रिपोर्ट करा:  
👉 https://github.com/FlowiseAI/Flowise/issues/new/choose

## 👨‍💻 कोडमध्ये योगदान

कशात योगदान द्यावे हे ठरत नसेल तर काही कल्पना:

- `packages/components` मध्ये नवीन कॉम्पोनंट्स तयार करा  
- विद्यमान कॉम्पोनंट्स अपडेट करा / फीचर्स वाढवा / बग दुरुस्त करा  
- नवीन chatflow templates जोडा  

---

## 👨‍💻 डेव्हलपर्स

Flowise एक Mono-Repo आहे ज्यामध्ये तीन मुख्य मॉड्यूल्स आहेत:

- `server`: API लॉजिकसाठी Node backend  
- `ui`: React फ्रंटएंड  
- `components`: तृतीय-पक्ष इंटिग्रेशन नोड्स  

### पूर्वअट

PNPM इन्स्टॉल करा (प्रकल्प PNPM v9 वापरतो)

```bash
npm i -g pnpm
```

---

## 🔧 Step-by-Step योगदान प्रक्रिया

### 1. Flowise ची अधिकृत GitHub रिपॉझिटरी Fork करा  
👉 https://github.com/FlowiseAI/Flowise

### 2. तुमची Fork केलेली रिपॉझिटरी Clone करा

### 3. नवीन Branch तयार करा  
नाव देण्याचे नियम:

- फीचर साठी: `feature/<feature-name>`
- बग फिक्ससाठी: `bugfix/<bug-name>`

### 4. नवीन branch वर स्विच करा

### 5. प्रोजेक्ट फोल्डरमध्ये जा:

```bash
cd Flowise
```

### 6. सर्व dependencies इन्स्टॉल करा:

```bash
pnpm install
```

### 7. प्रोजेक्ट build करा:

```bash
pnpm build
```

### 8. अॅप सुरू करा (production मोड)

```bash
pnpm start
```

भेट द्या: http://localhost:3000

---

## 🧑‍💻 Development चालवणे

- `packages/ui` मध्ये `.env` तयार करा आणि `VITE_PORT` सेट करा  
- `packages/server` मध्ये `.env` तयार करा आणि `PORT` सेट करा  

डेव्ह मोड:

```bash
pnpm dev
```

UI किंवा Server मधील बदल येथे दिसतील:  
👉 http://localhost:8080

Components मधील बदल लागू करण्यासाठी:

```bash
pnpm build
```

---

## 🧪 बदल केल्यानंतर तपासा

```bash
pnpm build
pnpm start
```

हे production मध्ये सर्व काही योग्य चालते याची खात्री करते.

---

## 🔁 Pull Request सबमिट करा

तुमच्या Fork मधून PR तयार करा आणि Flowise मुख्य शाखेकडे पाठवा:  
👉 https://github.com/FlowiseAI/Flowise/tree/main

Flowise टीममधील एखाद्या सदस्याला आपोआप Assign केले जाईल.  
मदतीसाठी Discord वर संपर्क करा:  
👉 https://discord.gg/jbaHfsRVBW

---

# 🌱 Env Variables

Flowise इंस्टन्स कॉन्फिगर करण्यासाठी `.env` फाइल वापरली जाते  
(स्थान: `packages/server`)

अधिक माहिती: https://docs.flowiseai.com/environment-variables

| Variable | Description | Type | Default |
|---------|-------------|-------|---------|
| PORT | Flowise HTTP पोर्ट | Number | 3000 |
| CORS_ORIGINS | Cross-origin विनंत्यांसाठी परवानगी दिलेले Origins | String | — |
| IFRAME_ORIGINS | iframe embedding origins | String | — |
| FLOWISE_FILE_SIZE_LIMIT | File upload size limit | String | 50mb |
| DEBUG | Components चे log print करा | Boolean | — |
| LOG_PATH | Logs ज्या ठिकाणी सेव्ह होतात | String | `your-path/Flowise/logs` |
| LOG_LEVEL | Log level (`error`/`info`/`verbose`/`debug`) | String | `info` |
| TOOL_FUNCTION_BUILTIN_DEP | Custom tool/function साठी NodeJS built-ins | String | — |
| TOOL_FUNCTION_EXTERNAL_DEP | Custom tool/function साठी बाह्य modules | String | — |
| ALLOW_BUILTIN_DEP | Project dependencies वापरण्यास परवानगी द्या | Boolean | false |
| DATABASE_TYPE | Database प्रकार (`sqlite`, `mysql`, `postgres`) | String | sqlite |
| DATABASE_PATH | SQLite database location | String | `~/.flowise` |
| DATABASE_HOST | Host (sqlite नसल्यास) | String | — |
| DATABASE_PORT | Database पोर्ट | String | — |
| DATABASE_USER | DB User | String | — |
| DATABASE_PASSWORD | DB Password | String | — |
| DATABASE_NAME | DB Name | String | — |
| DATABASE_SSL | PostgreSQL SSL | Boolean | false |
| SECRETKEY_PATH | Encryption key जतन केलेली जागा | String | Flowise/server |
| FLOWISE_SECRETKEY_OVERWRITE | Custom encryption key | String | — |
| MODEL_LIST_CONFIG_JSON | Local model list config JSON | String | /path/to/file |
| STORAGE_TYPE | Storage प्रकार (`local`, `s3`, `gcs`) | String | local |
| BLOB_STORAGE_PATH | Local uploads path | String | ~/.flowise/storage |
| S3_STORAGE_BUCKET_NAME | S3 bucket name | String | — |
| S3_STORAGE_ACCESS_KEY_ID | Access key | String | — |
| S3_STORAGE_SECRET_ACCESS_KEY | Secret key | String | — |
| S3_STORAGE_REGION | AWS region | String | — |
| S3_ENDPOINT_URL | Custom S3 endpoint | String | — |
| GOOGLE_CLOUD_STORAGE_PROJ_ID | Google project ID | String | — |
| GOOGLE_CLOUD_STORAGE_CREDENTIAL | Credentials path | String | — |
| GOOGLE_CLOUD_STORAGE_BUCKET_NAME | GCS bucket name | String | — |

### npx वापरताना variables सेट करू शकता:

```
npx flowise start --PORT=3000 --DEBUG=true
```

---

## 📖 Docs मध्ये योगदान

Docs रिपॉझिटरी:  
👉 https://github.com/FlowiseAI/FlowiseDocs

---

## 🏷️ Pull Request प्रक्रिया

PR उघडताच Flowise टीममधील सदस्य आपोआप Assign होईल.  
प्रश्न असल्यास Discord वर संपर्क साधा.

---

## 📜 Code of Conduct

सर्व contributors यांनी Code of Conduct पाळणे गरजेचे आहे.

हे येथे उपलब्ध आहे:  
👉 CODE_OF_CONDUCT.md

अस्वीकार्य वर्तनाबद्दल रिपोर्ट करण्यासाठी: **hello@flowiseai.com**