# Flowise 커스텀 개발 워크플로우 가이드

## 📖 목차
- [프로젝트 개요](#-프로젝트-개요)
- [초기 설정](#-초기-설정)
- [브랜치 전략](#-브랜치-전략)
- [정기적인 업스트림 동기화](#-정기적인-업스트림-동기화)
- [커스텀 기능 개발 워크플로우](#️-커스텀-기능-개발-워크플로우)
- [동료 개발자와의 협업](#-동료-개발자와의-협업)
- [커스텀 개발 방법론](#-커스텀-개발-방법론)
- [유용한 Git 명령어 모음](#-유용한-git-명령어-모음)
- [정기적인 유지보수](#-정기적인-유지보수)
- [주의사항](#-주의사항)
- [개발 시나리오 예시](#-개발-시나리오-예시)

## 🎯 프로젝트 개요

본 프로젝트는 [FlowiseAI/Flowise](https://github.com/FlowiseAI/Flowise)를 fork하여 커스텀 기능을 개발하고, 원본 저장소의 업데이트를 지속적으로 받아오는 개발 환경입니다.

**저장소 정보:**
- **Origin**: https://github.com/Choi-Woo-Young/Flowise-nice.git (fork된 저장소)
- **Upstream**: https://github.com/FlowiseAI/Flowise.git (원본 저장소)

## 🚀 초기 설정

### 1. 저장소 클론 및 upstream 설정

```bash
# 저장소 클론
git clone https://github.com/Choi-Woo-Young/Flowise-nice.git
cd Flowise-nice

# upstream 리모트 추가 (이미 설정됨)
git remote add upstream https://github.com/FlowiseAI/Flowise.git

# 리모트 확인
git remote -v
```

### 2. 개발 환경 구성

```bash
# 의존성 설치
pnpm install

# 개발 모드 실행
pnpm dev

# 특정 포트에서 실행 (기본: 3000)
# packages/server/.env에서 PORT 설정
# packages/ui/.env에서 VITE_PORT 설정
```

## 🌿 브랜치 전략

### 브랜치 구조
```
main (원본 Flowise와 동기화되는 메인 브랜치)
├── develop (커스텀 개발을 위한 개발 브랜치)
    ├── feature/새기능명 (개별 기능 개발 브랜치)
    ├── custom/커스텀기능명 (커스텀 기능 전용 브랜치)
    └── bugfix/버그수정명 (버그 수정 브랜치)
```

### 브랜치별 역할
- **main**: upstream과 동기화, 직접 푸시 금지
- **develop**: 안정된 커스텀 기능들의 통합 브랜치
- **feature/***: 새로운 기능 개발용
- **custom/***: 커스텀 노드/컴포넌트 개발용
- **bugfix/***: 버그 수정용

## 🔄 정기적인 업스트림 동기화

### 매주/격주 권장 동기화 프로세스

```bash
# 1. main 브랜치로 이동
git checkout main

# 2. upstream에서 최신 변경사항 가져오기
git fetch upstream

# 3. upstream/main을 현재 main에 병합
git merge upstream/main

# 4. 변경사항을 origin에 푸시
git push origin main

# 5. develop 브랜치를 main과 동기화
git checkout develop
git merge main
git push origin develop
```

### 동기화 시 주의사항
- 병합 전에 변경사항 검토: `git log --oneline main..upstream/main`
- 충돌 발생 시 신중하게 해결
- 커스텀 기능에 영향을 주는지 테스트

## 🛠️ 커스텀 기능 개발 워크플로우

### 1. 새로운 기능 개발 시작

```bash
# develop 브랜치에서 최신 상태로 업데이트
git checkout develop
git pull origin develop

# 새로운 기능 브랜치 생성
git checkout -b feature/새로운기능명
# 또는
git checkout -b custom/커스텀노드명
```

### 2. 개발 작업 수행

```bash
# 개발 작업 진행
# ... 코드 작성 ...

# 변경사항 확인
git status
git diff

# 스테이징
git add .
# 또는 선택적 추가
git add packages/components/nodes/새노드/
```

### 3. 커밋 및 푸시

```bash
# 커밋 (Conventional Commits 형식 권장)
git commit -m "feat: 새로운 커스텀 노드 추가"
git commit -m "fix: 버그 수정"
git commit -m "docs: 문서 업데이트"

# 브랜치 푸시
git push origin feature/새로운기능명
```

### 4. Pull Request 생성

1. GitHub에서 Pull Request 생성
2. `feature/새로운기능명` → `develop`
3. 코드 리뷰 요청
4. 테스트 확인
5. 병합 완료

### 5. 브랜치 정리

```bash
# develop 브랜치로 이동 후 업데이트
git checkout develop
git pull origin develop

# 병합된 브랜치 삭제
git branch -d feature/새로운기능명

# 원격 브랜치도 삭제
git push origin --delete feature/새로운기능명
```

## 👥 동료 개발자와의 협업

### 새로운 팀원 온보딩

```bash
# 1. 저장소 클론
git clone https://github.com/Choi-Woo-Young/Flowise-nice.git
cd Flowise-nice

# 2. upstream 리모트 추가
git remote add upstream https://github.com/FlowiseAI/Flowise.git

# 3. 개발 브랜치로 전환
git checkout develop

# 4. 개발 환경 설정
pnpm install
```

### 협업 규칙

1. **직접 푸시 금지**: main 브랜치에는 절대 직접 푸시하지 않음
2. **Pull Request 필수**: 모든 변경사항은 PR을 통해 진행
3. **코드 리뷰**: 최소 1명 이상의 리뷰 후 병합
4. **테스트**: 새로운 기능은 반드시 테스트 후 PR 생성
5. **커밋 메시지**: Conventional Commits 형식 사용

### 브랜치 네이밍 컨벤션

```
feature/기능명-간단설명    # 예: feature/openai-vision-support
custom/노드명             # 예: custom/custom-retriever-node
bugfix/이슈번호-버그설명  # 예: bugfix/123-memory-leak-fix
hotfix/긴급수정           # 예: hotfix/security-patch
```

## 🚀 커스텀 개발 방법론

### Flowise 프로젝트 구조

```
packages/
├── components/           # 🎯 주요 커스텀 개발 영역
│   ├── credentials/     # API 키, 인증 정보
│   └── nodes/          # 커스텀 노드 개발
│       ├── agents/     # AI 에이전트
│       ├── chains/     # 체인 노드
│       ├── chatmodels/ # 채팅 모델
│       ├── embeddings/ # 임베딩 모델
│       ├── tools/      # 도구 노드
│       └── vectorstores/ # 벡터 스토어
├── server/              # 백엔드 API 로직
├── ui/                  # 프론트엔드 React 앱
└── api-documentation/   # API 문서
```

### 커스텀 노드 개발 가이드

#### 1. 새로운 노드 생성

```bash
# 적절한 카테고리 폴더로 이동
cd packages/components/nodes/tools/

# 새 노드 폴더 생성
mkdir MyCustomTool
cd MyCustomTool
```

#### 2. 노드 클래스 구현

```typescript
// MyCustomTool.ts
import { INode, INodeData, INodeParams } from '../../../src/Interface'

class MyCustomTool implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    inputs: INodeParams[]
    
    constructor() {
        this.label = 'My Custom Tool'
        this.name = 'myCustomTool'
        this.version = 1.0
        this.type = 'Tool'
        this.category = 'Tools'
        this.description = '커스텀 도구 설명'
        this.inputs = [
            // 입력 파라미터 정의
        ]
    }

    async init(nodeData: INodeData): Promise<Tool> {
        // 노드 초기화 로직
    }
}

module.exports = { nodeClass: MyCustomTool }
```

#### 3. 개발 환경에서 테스트

```bash
# 컴포넌트 빌드
cd packages/components
pnpm build

# 전체 개발 서버 실행
cd ../../
pnpm dev
```

### 개발 모드 명령어

```bash
# 전체 개발 모드
pnpm dev

# 특정 패키지만 개발
cd packages/ui && pnpm dev        # UI만 개발
cd packages/server && pnpm dev   # 서버만 개발
cd packages/components && pnpm dev # 컴포넌트만 개발

# 빌드
pnpm build

# 린팅
pnpm lint

# 테스트
pnpm test
```

## 🔧 유용한 Git 명령어 모음

### 동기화 관련

```bash
# upstream 변경사항 확인 (병합 전 미리보기)
git log --oneline main..upstream/main
git log --graph --oneline upstream/main

# 특정 브랜치의 변경사항만 확인
git diff main..upstream/main

# upstream 브랜치 상태 확인
git remote show upstream

# 원격 브랜치 정보 업데이트
git remote update
```

### 브랜치 관리

```bash
# 현재 브랜치에서 병합된 브랜치 목록
git branch --merged

# 병합되지 않은 브랜치 목록  
git branch --no-merged

# 로컬 브랜치 일괄 정리 (병합된 브랜치만)
git branch --merged | grep -v main | grep -v develop | xargs git branch -d

# 원격 브랜치 정리
git remote prune origin
```

### 충돌 해결

```bash
# 병합 도구 사용
git mergetool

# 충돌 해결 후 병합 완료
git commit

# 병합 취소 (문제 발생 시)
git merge --abort

# 리베이스 충돌 시
git rebase --continue  # 해결 후 계속
git rebase --abort     # 리베이스 취소
```

### 커밋 관리

```bash
# 특정 커밋만 가져오기
git cherry-pick <commit-hash>

# 마지막 커밋 메시지 수정
git commit --amend

# 커밋 히스토리 정리 (푸시 전에만)
git rebase -i HEAD~3

# 변경사항 임시 저장
git stash
git stash pop
git stash list
```

## 📋 정기적인 유지보수

### 주간 체크리스트

- [ ] **upstream 동기화 확인**
  ```bash
  git fetch upstream
  git log --oneline main..upstream/main
  ```

- [ ] **develop 브랜치 테스트**
  ```bash
  git checkout develop
  pnpm install
  pnpm build
  pnpm test
  ```

- [ ] **의존성 업데이트 검토**
  ```bash
  pnpm outdated
  # 필요시 업데이트
  pnpm update
  ```

- [ ] **사용하지 않는 브랜치 정리**
  ```bash
  git branch --merged | grep -v main | grep -v develop | xargs git branch -d
  ```

### 월간 체크리스트

- [ ] **전체 프로젝트 빌드 테스트**
- [ ] **커스텀 기능과 upstream 변경사항 호환성 검토**
- [ ] **문서 업데이트** (이 가이드 포함)
- [ ] **보안 업데이트 확인**
- [ ] **성능 최적화 검토**

### 분기별 체크리스트

- [ ] **대규모 upstream 변경사항 분석**
- [ ] **아키텍처 리뷰**
- [ ] **팀 워크플로우 개선점 검토**
- [ ] **백업 및 복구 계획 점검**

## 🚨 주의사항

### ❌ 금지사항

1. **main 브랜치에 직접 커밋 금지**
   ```bash
   # 이렇게 하지 마세요
   git checkout main
   git commit -m "fix: something"
   ```

2. **upstream 저장소에 직접 푸시 금지**
3. **force push 사용 금지** (공유 브랜치에서)
   ```bash
   # 위험: 다른 사람의 작업을 덮어쓸 수 있음
   git push --force origin develop  # 금지!
   ```

4. **원본 파일 직접 수정 최소화**
   - 새로운 파일 추가를 우선적으로 고려
   - 수정 시 upstream 변경사항과 충돌 가능성 검토

### ⚠️ 주의사항

1. **업스트림 동기화 시 신중한 검토**
   - 커스텀 기능에 영향을 줄 수 있는 변경사항 확인
   - 테스트 환경에서 먼저 검증

2. **커스텀 노드 개발 시 위치 준수**
   ```
   ✅ packages/components/nodes/[category]/YourCustomNode/
   ❌ packages/server/src/ (기존 파일 수정)
   ```

3. **의존성 추가 시 신중히 검토**
   - package.json 변경 시 팀원과 공유
   - 라이선스 충돌 여부 확인

4. **환경변수 관리**
   - `.env` 파일을 git에 커밋하지 않음
   - `.env.example`로 템플릿 제공

## 🎯 개발 시나리오 예시

### 시나리오 1: 새로운 커스텀 ChatModel 노드 추가

```bash
# 1. 개발 브랜치에서 시작
git checkout develop
git pull origin develop

# 2. 기능 브랜치 생성
git checkout -b custom/my-chatmodel

# 3. 노드 폴더 생성
mkdir packages/components/nodes/chatmodels/MyCustomChatModel
cd packages/components/nodes/chatmodels/MyCustomChatModel

# 4. 필요한 파일 생성
touch MyCustomChatModel.ts
touch MyCustomChatModel.png  # 아이콘

# 5. 구현 및 테스트
# ... 개발 작업 ...

# 6. 커밋 및 푸시
git add .
git commit -m "feat: MyCustomChatModel 노드 추가

- 새로운 AI 모델 연동
- 스트리밍 지원
- 토큰 사용량 추적 기능"

git push origin custom/my-chatmodel

# 7. GitHub에서 PR 생성
# custom/my-chatmodel -> develop
```

### 시나리오 2: 버그 수정

```bash
# 1. 이슈 확인 후 버그픽스 브랜치 생성
git checkout develop
git checkout -b bugfix/memory-leak-fix

# 2. 버그 수정
# ... 코드 수정 ...

# 3. 테스트
pnpm test
pnpm build

# 4. 커밋
git commit -m "fix: 메모리 누수 문제 해결

- Vector Store 연결 해제 로직 추가
- 불필요한 객체 참조 제거
- 가비지 컬렉션 최적화

Fixes #123"

# 5. 푸시 및 PR
git push origin bugfix/memory-leak-fix
```

### 시나리오 3: 대규모 업스트림 업데이트 병합

```bash
# 1. 현재 작업 저장
git stash

# 2. main 브랜치에서 업스트림 동기화
git checkout main
git fetch upstream
git log --oneline main..upstream/main  # 변경사항 검토

# 3. 병합 수행
git merge upstream/main

# 4. 충돌 해결 (필요시)
git status
# 충돌 파일 수정
git add .
git commit

# 5. origin에 푸시
git push origin main

# 6. develop 브랜치 업데이트
git checkout develop
git merge main

# 7. 충돌 해결 후 푸시
git push origin develop

# 8. 기존 작업 복원
git stash pop
```

## 📚 추가 리소스

### 공식 문서
- [Flowise 공식 문서](https://docs.flowiseai.com/)
- [Flowise GitHub](https://github.com/FlowiseAI/Flowise)
- [LangChain 문서](https://js.langchain.com/)

### 개발 도구
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Semantic Versioning](https://semver.org/)

### 팀 커뮤니케이션
- GitHub Issues: 버그 리포트 및 기능 요청
- GitHub Discussions: 일반적인 질문 및 아이디어 공유
- Pull Request: 코드 리뷰 및 변경사항 논의

---

## 📝 마지막 업데이트

**작성일**: 2024년 1월
**작성자**: [Your Name]
**버전**: 1.0.0

이 가이드는 프로젝트 진행에 따라 지속적으로 업데이트됩니다. 개선사항이나 질문이 있으시면 언제든 이슈를 생성해주세요.

---

**Happy Coding! 🚀**
