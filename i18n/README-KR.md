<!-- markdownlint-disable MD030 -->

<img width="100%" src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise.png?raw=true"></a>

# Flowise - 간편한 LLM 애플리케이션 제작

[![Release Notes](https://img.shields.io/github/release/FlowiseAI/Flowise)](https://github.com/FlowiseAI/Flowise/releases)
[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter Follow](https://img.shields.io/twitter/follow/FlowiseAI?style=social)](https://twitter.com/FlowiseAI)
[![GitHub star chart](https://img.shields.io/github/stars/FlowiseAI/Flowise?style=social)](https://star-history.com/#FlowiseAI/Flowise)
[![GitHub fork](https://img.shields.io/github/forks/FlowiseAI/Flowise?style=social)](https://github.com/FlowiseAI/Flowise/fork)

[English](../README.md) | [中文](./README-ZH.md) | [日本語](./README-JA.md) | 한국어

<h3>드래그 앤 드롭 UI로 맞춤형 LLM 플로우 구축하기</h3>
<a href="https://github.com/FlowiseAI/Flowise">
<img width="100%" src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise.gif?raw=true"></a>

## ⚡빠른 시작 가이드

18.15.0 버전 이상의 [NodeJS](https://nodejs.org/en/download) 다운로드 및 설치

1. Flowise 설치
    ```bash
    npm install -g flowise
    ```
2. Flowise 시작하기

    ```bash
    npx flowise start
    ```

    사용자 이름과 비밀번호로 시작하기

    ```bash
    npx flowise start --FLOWISE_USERNAME=user --FLOWISE_PASSWORD=1234
    ```

3. [http://localhost:3000](http://localhost:3000) URL 열기

## 🐳 도커(Docker)를 활용하여 시작하기

### 도커 컴포즈 활용

1. 프로젝트의 최상위(root) 디렉토리에 있는 `docker` 폴더로 이동하세요.
2. `.env.example` 파일을 복사한 후, 같은 경로에 붙여넣기 한 다음, `.env`로 이름을 변경합니다.
3. `docker compose up -d` 실행
4. [http://localhost:3000](http://localhost:3000) URL 열기
5. `docker compose stop` 명령어를 통해 컨테이너를 종료시킬 수 있습니다.

### 도커 이미지 활용

1. 로컬에서 이미지 빌드하기:
    ```bash
    docker build --no-cache -t flowise .
    ```
2. 이미지 실행하기:

    ```bash
    docker run -d --name flowise -p 3000:3000 flowise
    ```

3. 이미지 종료하기:
    ```bash
    docker stop flowise
    ```

## 👨‍💻 개발자들을 위한 가이드

Flowise는 단일 리포지토리에 3개의 서로 다른 모듈이 있습니다.

-   `server`: API 로직을 제공하는 노드 백엔드
-   `ui`: 리액트 프론트엔드
-   `components`: 서드파티 노드 통합을 위한 컴포넌트

### 사전 설치 요건

-   [PNPM](https://pnpm.io/installation) 설치하기
    ```bash
    npm i -g pnpm
    ```

### 설치 및 설정

1. 리포지토리 복제

    ```bash
    git clone https://github.com/FlowiseAI/Flowise.git
    ```

2. 리포지토리 폴더로 이동

    ```bash
    cd Flowise
    ```

3. 모든 모듈의 종속성 설치:

    ```bash
    pnpm install
    ```

4. 모든 코드 빌드하기:

    ```bash
    pnpm build
    ```

5. 애플리케이션 시작:

    ```bash
    pnpm start
    ```

    이제 [http://localhost:3000](http://localhost:3000)에서 애플리케이션에 접속할 수 있습니다.

6. 개발 환경에서 빌드할 경우:

    - `packages/ui`경로에 `.env` 파일을 생성하고 `VITE_PORT`(`.env.example` 참조)를 지정합니다.
    - `packages/server`경로에 `.env` 파일을 생성하고 `PORT`(`.env.example` 참조)를 지정합니다.
    - 실행하기

        ```bash
        pnpm dev
        ```

    코드가 변경되면 [http://localhost:8080](http://localhost:8080)에서 자동으로 애플리케이션을 새로고침 합니다.

## 🔒 인증

애플리케이션 수준의 인증을 사용하려면 `packages/server`의 `.env` 파일에 `FLOWISE_USERNAME` 및 `FLOWISE_PASSWORD`를 추가합니다:

```
FLOWISE_USERNAME=user
FLOWISE_PASSWORD=1234
```

## 🌱 환경 변수

Flowise는 인스턴스 구성을 위한 다양한 환경 변수를 지원합니다. `packages/server` 폴더 내 `.env` 파일에 다양한 환경 변수를 지정할 수 있습니다. [자세히 보기](https://github.com/FlowiseAI/Flowise/blob/main/CONTRIBUTING.md#-env-variables)

## 📖 공식 문서

[Flowise 문서](https://docs.flowiseai.com/)

## 🌐 자체 호스팅 하기

기존 인프라 환경에서 Flowise를 자체 호스팅으로 배포하세요. 다양한 배포 [deployments](https://docs.flowiseai.com/configuration/deployment) 방법을 지원합니다.

-   [AWS](https://docs.flowiseai.com/deployment/aws)
-   [Azure](https://docs.flowiseai.com/deployment/azure)
-   [Digital Ocean](https://docs.flowiseai.com/deployment/digital-ocean)
-   [GCP](https://docs.flowiseai.com/deployment/gcp)
-   <details>
      <summary>그 외</summary>

    -   [Railway](https://docs.flowiseai.com/deployment/railway)

        [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/pn4G8S?referralCode=WVNPD9)

    -   [Render](https://docs.flowiseai.com/deployment/render)

        [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://docs.flowiseai.com/deployment/render)

    -   [HuggingFace Spaces](https://docs.flowiseai.com/deployment/hugging-face)

        <a href="https://huggingface.co/spaces/FlowiseAI/Flowise"><img src="https://huggingface.co/datasets/huggingface/badges/raw/main/open-in-hf-spaces-sm.svg" alt="HuggingFace Spaces"></a>

    -   [Elestio](https://elest.io/open-source/flowiseai)

        [![Deploy](https://pub-da36157c854648669813f3f76c526c2b.r2.dev/deploy-on-elestio-black.png)](https://elest.io/open-source/flowiseai)

    -   [Sealos](https://cloud.sealos.io/?openapp=system-template%3FtemplateName%3Dflowise)

        [![](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](https://cloud.sealos.io/?openapp=system-template%3FtemplateName%3Dflowise)

    -   [RepoCloud](https://repocloud.io/details/?app_id=29)

        [![Deploy on RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploy.png)](https://repocloud.io/details/?app_id=29)

      </details>

## ☁️ 클라우드 호스팅 서비스

[Flowise Cloud 시작하기](https://flowiseai.com/)

## 🙋 기술 지원

질문, 버그 리포팅, 새로운 기능 요청 등은 [discussion](https://github.com/FlowiseAI/Flowise/discussions) 섹션에서 자유롭게 이야기 해주세요.

## 🙌 오픈소스 활동에 기여하기

다음과 같은 멋진 기여자들(contributors)에게 감사드립니다.

<a href="https://github.com/FlowiseAI/Flowise/graphs/contributors">
<img src="https://contrib.rocks/image?repo=FlowiseAI/Flowise" />
</a>

[contributing guide](CONTRIBUTING.md)를 살펴보세요. 디스코드 [Discord](https://discord.gg/jbaHfsRVBW) 채널에서도 이슈나 질의응답을 진행하실 수 있습니다.
[![Star History Chart](https://api.star-history.com/svg?repos=FlowiseAI/Flowise&type=Timeline)](https://star-history.com/#FlowiseAI/Flowise&Date)

## 📄 라이센스

본 리포지토리의 소스코드는 [Apache License Version 2.0](LICENSE.md) 라이센스가 적용됩니다.
