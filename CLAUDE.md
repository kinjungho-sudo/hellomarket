# CLAUDE.md — Co-Mind Works 개발 컨텍스트

> **프로젝트:** Co-Mind Works (코마인드웍스)  
> **버전:** v3.0  
> **업데이트:** 2026-04-14  
> **설계서:** comindworks_mvp_v2.md | **KPI:** KPI.md | **계획:** PLAN.md

---

## 제품 한 줄 정의

> "한 줄 명령으로 AI 팀이 자율적으로 프로젝트를 완성한다. 막히면 알림만 온다."

사용자는 의뢰인, Chief PM은 대리인, 나머지 에이전트는 실행팀.  
컨펌 한 번 이후 자율 실행. 쓸수록 우리 회사 전용 AI가 되어간다.

---

## 제품 핵심 철학

```
1. 자율 완료율이 곧 제품 가치
   블로커 없이 완료된 프로젝트 비율이 올라갈수록 좋은 제품

2. 지식 누적이 Lock-in
   프로젝트가 쌓일수록 회사 맞춤화 → 다른 서비스로 못 옮김

3. 사용자 시간을 산다
   Claude 직접 쓸 때 = 매번 설명 + 기다림
   이 제품 쓸 때 = 컨펌 한 번 + 아침에 결과물
```

---

## 기술 스택

| 영역 | 기술 | 버전 | 비고 |
|------|------|------|------|
| Frontend | React + Vite | 18.3.1 | SPA |
| State | Zustand + React Query | 5.0.3 / 5.66.0 | |
| Styling | Tailwind CSS + Framer Motion | 3.4.17 / 12.6.5 | |
| Rich Text | Tiptap | 3.22.3 | 아티팩트 편집 |
| Code Editor | Monaco Editor | 4.7.0 | 코드 아티팩트 |
| Backend | Vercel Edge Functions | Node.js | 서버리스 |
| Database | Supabase PostgreSQL 15+ | | pgvector 포함 |
| Realtime | Supabase Realtime | | WebSocket |
| Auth | Supabase Auth | | JWT |
| AI | Claude API | claude-sonnet-4-6 | Tool Use + SSE |
| Storage | Supabase Storage | | 파일 업로드 |
| Hosting | Vercel | | 자동 배포 |

**⚠️ 절대 추가하지 말 것:** Phaser.js (제거됨), React Flow (불필요)

---

## 핵심 개념

### 오케스트레이션 플로우
```
사용자 "프로젝트 시작"
    ↓
Chief PM 질문 수집 (기술/비즈니스/환경 — 한 번에)
    ↓
기획서(PRD) 생성 → 사용자 컨펌
    ↓
팀 구성 → 에이전트들 자율 실행 (사용자 개입 없음)
    ↓
완료 → 결과 전달  /  블로커 → 인앱 알림 → 재개
```

### 에이전트 타입 3종
```
Persistent  우리 회사에서 계속 일한 직원. 기억 + 학습 축적.
Template    검증된 범용 에이전트. 기억 없음, 스킬만 있음.
Ephemeral   이번 프로젝트만 쓰는 임시 전문가.
```

### 에이전트 = 3레이어
```
Persona     이름, 성격, 말투, 가치관
Skills      잘하는 것, 못하는 것, 핸드오프 대상
Knowledge   .md 파일 (템플릿, 지침서) + memory/ (누적 경험)
```

---

## 현재 개발 상태

### ✅ 이미 구현됨
- Supabase Auth (이메일 로그인)
- Slack형 워크스페이스 UI (WorkspaceLayout, ChannelSidebar, MessageThread, MessageInput)
- 에이전트 CRUD (AgentList, CreateAgentModal, AgentDetailModal)
- 단일 에이전트 작업 실행 (taskService, useTaskStore)
- Claude API SSE 스트리밍 (ThinkingStream, useStreamStore)
- 능력 카드 시스템 (AbilityCard, dnd-kit)
- 아티팩트 패널 (Tiptap + Monaco)
- pgvector 메모리 구조
- Supabase Realtime 기반 메시지 동기화

### ❌ 미구현 (개발 대상)
- 프로젝트 단위 구조 (projects 테이블)
- Chief PM 오케스트레이터 (api/projects/orchestrate.js)
- 에이전트 간 자율 협업 (inter-agent messaging)
- 블로커 감지 + 인앱 알림 (blockers 테이블 + Realtime)
- 회사 지식베이스 누적 (knowledge_base 테이블)
- 에이전트 타입 3종 구조 (agent_type 컬럼)
- 작업 현황 대시보드
- API 키 관리 UI

---

## 개발 우선순위

### P0 — 지금 (프로젝트 구조 기반)
```
1. DB 마이그레이션: projects / blockers / knowledge_base 테이블 추가
2. agents 테이블: agent_type, knowledge_config 컬럼 추가
3. 프로젝트 생성 UI + 사이드바
```

### P1 — 핵심 차별점 (오케스트레이션)
```
4. Chief PM 오케스트레이터 API (api/projects/orchestrate.js)
5. 에이전트 간 통신 (inter_agent 메시지)
6. 블로커 감지 + Supabase Realtime 알림
```

### P2 — 완성도
```
7. 작업 현황 대시보드
8. 지식베이스 자동 기록
9. 에이전트 3레이어 구조 완성
```

### P3 — 제품화
```
10. API 키 관리 UI (암호화 저장)
11. 온보딩 개선
12. 멀티테넌트 검증
```

---

## DB 스키마 현황

### 기존 테이블 (변경 없음)
- `users` — 사용자 계정
- `workspaces` — 워크스페이스 (= 오피스)
- `agents` — AI 에이전트
- `ability_cards` — 능력 카드 템플릿
- `channels` — Slack형 채널
- `messages` — 채팅 메시지
- `artifacts` — 생성 결과물 (문서/코드)
- `agent_memories` — pgvector 메모리
- `agent_skill_docs` — 에이전트 자기 기록 .md

### 추가 필요 테이블 (v3.0)
- `projects` — 프로젝트 (status, spec_doc, team_config)
- `blockers` — 블로커 알림 (type, message, resolution, status)
- `knowledge_base` — 회사 지식 누적 (category, embedding)
- `agent_templates` — 템플릿 에이전트 정의

### agents 테이블 추가 컬럼
```sql
agent_type VARCHAR(20) DEFAULT 'persistent'
  CHECK (agent_type IN ('persistent', 'template', 'ephemeral'))
knowledge_config JSONB DEFAULT '{}'
  -- { rag_files: [], memory_path: '', skill_doc: '' }
```

---

## 코딩 컨벤션

### API (Vercel Edge Functions)
```js
// api/[resource]/[action].js
export default async function handler(req, res) {
  // 1. JWT 인증 먼저
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  // 2. RLS가 있어도 서비스 키는 service role로만
  // 3. 에러: { error: message } 형식 통일
  // 4. SSE: Content-Type: text/event-stream
}
```

### Claude API 호출 패턴
```js
// model은 항상 claude-sonnet-4-6 (claude-sonnet-4-20250514 아님)
// Chief PM: claude-sonnet-4-6 (판단 필요)
// Worker Agent: claude-haiku-4-5-20251001 (비용 효율)

const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  system: buildSystemPrompt(agent),  // persona + skills + knowledge
  messages,
  tools,
})
```

### System Prompt 구성 순서
```
1. Agent Persona (이름, 역할, 성격, 말투)
2. Agent Skills (잘하는 것, 못하는 것)
3. Knowledge Files (RAG .md 파일 내용)
4. Top 5 Memories (pgvector 검색 결과)
5. Skill Doc (에이전트 자기 기록 .md)
6. Current Task (현재 지시사항)
```

### Supabase 규칙
```
- 모든 테이블 RLS 필수
- 클라이언트: anon key
- 서버(API): service role key
- Realtime: supabase_realtime 퍼블리케이션에 추가
- .env 파일은 터미널 echo 명령으로만 생성 (Write 툴 금지)
```

### Frontend 컴포넌트
```jsx
// Zustand store에서 필요한 것만 선택적으로 구독 (무한 렌더링 방지)
const agents = useAgentStore(state => state.agents)    // ✅
const store = useAgentStore()                          // ❌

// Tailwind만 사용, 인라인 style 최소화
// Framer Motion은 주요 전환 애니메이션에만 사용
```

---

## 에이전트 Tool 목록

### 기존 Tool (유지)
| Tool | 역할 |
|------|------|
| `request_approval` | HITL 승인 요청 |
| `save_memory` | 메모리 저장 |
| `write_document` | 문서 아티팩트 생성 |
| `generate_code` | 코드 아티팩트 생성 |
| `update_skill_doc` | 에이전트 자기 기록 .md 업데이트 |

### 신규 Tool (v3.0 추가 필요)
| Tool | 역할 |
|------|------|
| `dispatch_task` | Chief PM → Worker에게 태스크 하달 |
| `send_blocker` | 블로커 감지 → blockers 테이블 INSERT |
| `update_knowledge` | 완료 후 knowledge_base에 학습 내용 기록 |
| `request_api_key` | 필요한 API 키 사용자에게 요청 |

---

## 환경변수

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=        # 서버 전용, 클라이언트 번들 포함 금지

# AI
ANTHROPIC_API_KEY=           # 서버 전용

# 옵션
VITE_APP_ENV=development     # development | production
```

---

## 파일 구조

```
comindworks/
├── CLAUDE.md                 ← 이 파일 (개발 컨텍스트)
├── KPI.md                    ← KPI 문서
├── PLAN.md                   ← 개발 계획서
├── comindworks_mvp_v2.md     ← 전체 설계서 v3.0
│
├── api/
│   ├── auth/                 ← 인증 API
│   ├── agents/               ← 에이전트 CRUD
│   ├── tasks/[id]/stream.js  ← Claude SSE 스트리밍 (핵심)
│   ├── projects/
│   │   └── orchestrate.js    ← ★ Chief PM 오케스트레이터 (미구현)
│   ├── blockers/             ← ★ 블로커 API (미구현)
│   └── knowledge/            ← ★ 지식베이스 API (미구현)
│
├── src/
│   ├── components/
│   │   ├── layout/           ← WorkspaceLayout, ChannelSidebar 등
│   │   ├── agents/           ← AgentList, CreateAgentModal 등
│   │   ├── tasks/            ← ThinkingStream, TaskTimeline 등
│   │   ├── abilities/        ← AbilityCard, AbilityCardInventory
│   │   ├── projects/         ← ★ 프로젝트 UI (미구현)
│   │   └── dashboard/        ← ★ 작업 현황 대시보드 (미구현)
│   ├── stores/               ← Zustand 스토어
│   ├── services/             ← API 호출 레이어
│   └── hooks/                ← 커스텀 훅
│
├── supabase/
│   └── migrations/           ← SQL 마이그레이션 (순서 중요)
│
└── .claude/
    └── agents/               ← Sub-agent 정의
        ├── chief-pm.md       ← ★ Chief PM 오케스트레이터
        ├── frontend.md
        ├── backend.md
        ├── ai-engine.md
        └── qa.md
```

---

## 반복 실수 방지

```
❌ Phaser.js 관련 코드 절대 추가하지 말 것 (제거됨)
❌ ANTHROPIC_API_KEY를 클라이언트 번들에 포함하지 말 것
❌ .env 파일을 Write 툴로 생성하지 말 것 (echo 명령 사용)
❌ Zustand store 전체를 구독하지 말 것 (무한 렌더링)
❌ agent_type 없이 에이전트를 생성하지 말 것 (기본값: persistent)
❌ RLS 없이 테이블 생성하지 말 것
❌ Chief PM을 Haiku로 실행하지 말 것 (Sonnet 필수)
```

---

## 검증 트리거

```
"검증 해줘"        → 전체 검증 (빌드 + 타입 + 보안 + 요청 반영)
"빌드 검증 해줘"   → npm run build 실행
"스키마 검증"      → migrations 순서 + RLS 정책 확인
"보안 검증"        → API 키 노출 + .env .gitignore 확인
```

---

## KPI 핵심 3가지

```
① 프로젝트 자율 완료율  (North Star — 목표: 50%+)
② WAU                  (재방문 — 목표: 40%+)
③ NPS                  (만족도 — 목표: 30+)
```

## 절대 규칙 (이 규칙을 어기면 멈추고 알려주세요)

아래 규칙과 충돌하는 요청이 들어오면, 멈추고 사용자에게 먼저 확인하세요.

---

### 1. 기술 스택은 바꾸지 마세요

| 역할 | 사용할 기술 | 다른 거 쓰면 안 됨 |
|------|------------|------------------|
| 프레임워크 | React + Vite + TypeScript | Next.js, Vue, Angular 안 됨 |
| UI | Tailwind CSS | Bootstrap, MUI 안 됨 |
| 데이터/로그인/파일저장 | Supabase | Firebase, AWS 안 됨 |
| 런타임 | Node.js | Deno, Bun 안 됨 |
| 웹에 올리기 | Vercel | Netlify, 다른 거 안 됨 |

사용자가 다른 기술을 요청하면 이렇게 물어보세요:
> "이 도구는 React + Vite + Supabase + Vercel 조합에 맞춰져 있어요.
> 다른 걸 쓰면 제가 제대로 도와드리기 어려워요.
> 일단 이 조합으로 빨리 만들어볼까요?"

---

### 2. 항상 한국어로, 쉽게 설명하세요

- 모든 대답은 한국어로 합니다
- 사용자는 코딩과 바이브 코딩에 익숙하지 않습니다.
- 어려운 말이 나오면, 바로 뒤에 쉬운 말로 다시 설명하세요
  - 예: "터미널(명령어를 입력하는 검은 창)"
  - 예: "환경변수(비밀 설정값을 저장하는 파일)"
- "알아서 해보세요", "패턴을 보고 응용하세요" 같은 말 하면 안 됨
- 복사-붙여넣기 가능한 코드를 주세요
- 어디에 붙여넣을지 정확히 알려주세요
- 어떤 일이 벌어졌는지 항상 요약 설명해주세요.

---

### 3. 효율적으로 진행하세요

코드를 만들기 전에 계획을 먼저 보여주고, 확인을 기다리지 않고 바로 작업을 진행합니다:

1. "이렇게 할 거예요" - 계획 보여주기
2. 바로 코드 만들기 (사용자의 허락을 기다리지 않음)
3. 다 했으면 - 뭘 했는지 정리해주기

한 번에 5개 파일 이상 바꾸지 마세요.

---

### 4. 비밀 정보는 보여주지도, 일반 파일에 적지도 마세요

- `.env` 파일의 실제 값은 절대 화면에 출력하지 마세요
- 예시가 필요하면 이렇게 쓰세요:
  - `YOUR_SUPABASE_URL` (실제 값 대신)
  - `YOUR_API_KEY` (실제 값 대신)
- **비밀값(API 키, 토큰, Webhook URL, 비밀번호)을 `memo.md`, `note.md`, `scratch/`, `*test*.js` 같은 일반 파일에 절대 적지 마세요.** 이 파일들은 `vercel deploy` 시 함께 업로드되어 외부에 노출됩니다. `.gitignore`로는 막지 못합니다 (Vercel CLI는 `.vercelignore`를 따로 봅니다).
- 비밀값을 적을 곳은 두 군데뿐입니다:
  - 로컬 작업: `.env` 파일 (반드시 `.gitignore`와 `.vercelignore`에 등록)
  - 배포 환경: Vercel 대시보드 -> Settings -> Environment Variables
- 사용자가 메모 파일에 비밀값을 적어달라고 하면, 멈추고 이렇게 안내하세요:
  > "이 메모는 `vercel deploy` 시 같이 올라가서 외부에 노출될 수 있어요.
  > 비밀값은 `.env`에만 적고, 메모에는 `YOUR_DISCORD_WEBHOOK_URL` 같은 자리표시자만 적을게요."

---

### 5. 필요한 경우 과감하게 수정하세요

파일을 삭제하거나 크게 바꾸는 것도 사용자의 확인 없이 필요하다고 판단되면 바로 진행하세요. 단, 작업 후에는 어떤 파일을 왜 수정/삭제했는지 명확히 알려주세요.

---

### 6. 설정할 때는 클릭 경로까지 알려주세요

Supabase, Vercel 같은 사이트 설정을 안내할 때:
- 어디를 클릭해야 하는지
- 버튼 이름이 뭔지
- 화면에 뭐가 보이는지
구체적으로 알려주세요.

---

### 7. 환경 세팅은 자동으로 처리하세요

사용자가 "시작해줘"라고 하면 다음을 순서대로 실행하세요:

1. Node.js 설치 확인 (`node -v`). 없으면:
   - Mac: `brew install node` 또는 nodejs.org에서 다운로드 안내
   - Windows: 아래 순서대로 시도하세요
     1. `winget install OpenJS.NodeJS.LTS` 실행
     2. winget이 안 되면 ("winget을 찾을 수 없습니다" 에러), nodejs.org에서 LTS 버전 다운로드 안내
     3. 설치 완료 후, 반드시 터미널을 완전히 껐다가 다시 열기 (닫기 버튼 클릭 후 새 터미널 열기)
     4. 새 터미널에서 `node -v`로 확인. 여전히 안 되면 컴퓨터를 재시작하라고 안내
2. 프로젝트 생성 (`npm create vite@latest [프로젝트이름] -- --template react-ts`)
3. 의존성 설치 (`cd [프로젝트이름] && npm install`)
4. Tailwind CSS 설치 (`npm install -D tailwindcss @tailwindcss/vite`)
5. Supabase 클라이언트 설치 (`npm install @supabase/supabase-js`)
6. **`.gitignore` + `.vercelignore` 자동 생성 (규칙 8 참고)**
7. 로컬 서버 실행 (`npm run dev`)

각 단계에서 에러가 나면 멈추고 에러 메시지를 보여주세요.
사용자에게 "다음 단계로 넘어갈까요?"라고 물어보세요.

Windows 사용자라면, 위 단계 시작 전에 아래를 먼저 점검하세요:
- 터미널 종류 확인: PowerShell을 사용하세요. cmd(명령 프롬프트)는 쓰지 마세요. 사용자가 cmd를 쓰고 있으면 PowerShell로 바꾸라고 안내하세요. PowerShell 여는 방법: 키보드에서 Windows 키를 누르고 "PowerShell" 입력 후 클릭.
- 프로젝트 폴더 경로에 한글이 있으면 에러가 날 수 있어요. 반드시 `C:\dev\` 같은 영어 경로에 프로젝트를 만드세요. 바탕화면이나 문서 폴더에서 작업하지 마세요. 사용자가 시작하면 제일 먼저 `mkdir C:\dev` -> `cd C:\dev`를 실행하세요.
- PowerShell 실행 정책 차단: npm 첫 실행 시 "스크립트를 실행할 수 없습니다" 에러가 나면 `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`를 먼저 실행하세요.
- `npm` 명령이 안 될 때: "npm은(는) 내부 또는 외부 명령이 아닙니다"라고 나오면, Node.js 설치 후 터미널을 껐다 열지 않은 것입니다. 터미널을 완전히 닫고 새로 여세요.

---

### 8. .gitignore와 .vercelignore를 항상 함께 만들고 점검하세요

`git push`는 `.gitignore`에 안 적힌 모든 파일을 GitHub 등 원격 저장소에 올립니다.
`vercel deploy`는 `.vercelignore`에 안 적힌 모든 파일을 Vercel 서버에 업로드합니다.
**둘은 서로 다른 파일이고, 한쪽만 있어서는 막지 못합니다.** Vercel CLI는 두 파일을 따로 보기 때문에, `.gitignore`에 적었어도 `.vercelignore`에 없으면 그대로 올라갑니다.

프로젝트 시작 시 두 파일을 모두 자동으로 만드세요. **두 파일 내용은 동일하게 유지합니다** (학생이 헷갈리지 않도록).

`.gitignore` 또는 `.vercelignore`가 없거나 부실하면 아래 내용으로 새로 만들거나 보강하세요. **두 파일에 동일한 내용을 넣습니다**:

```
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment & Secrets (절대 외부 노출 금지)
.env
.env.*
!.env.example

# OS
.DS_Store
Thumbs.db

# Editor
*.swp
*.swo
*~
.vscode/
.idea/

# Logs
*.log
npm-debug.log*

# Vercel
.vercel/

# Memo / Scratch / Test files (비밀값 노출 위험)
memo.md
memo*.md
note.md
note*.md
scratch/
tmp/
*.test.js
*.test.ts
*.local.*
*.bak
*.old

# AI agent instruction (외부 노출 방지)
GEMINI.md
GEMINI*.md
CLAUDE.md
```

`/deploy` 직전에도 두 파일이 위 패턴을 모두 포함하는지 점검하고, 빠진 항목이 있으면 자동 추가 후 진행하세요. 두 파일 중 하나라도 없으면 먼저 만든 다음 배포를 진행하세요.

---

## 대화 스타일

1. 먼저 지금 상황을 한 줄로 알려주세요
   - 예: "지금은 퀴즈 앱을 React로 바꾸는 단계예요."

2. 그 다음 선택지 2-3개를 보여주세요
   - 각 선택지마다 시간과 난이도를 적어주세요
   - 예: "A) 퀴즈 데이터만 바꾸기 (5분, 쉬움)"
   - 예: "B) 디자인도 바꾸기 (10분, 보통)"

3. 사용자가 선택하면 한 단계씩 진행하세요

---

## 워크플로우

### /start - 프로젝트 시작

1. Node.js 설치 확인 + 설치
2. React + Vite + TypeScript 프로젝트 생성
3. Tailwind CSS 설정
4. Supabase 클라이언트 설정
5. `.gitignore` + `.vercelignore` 자동 생성 (규칙 8 패턴)
6. 기존 퀴즈 앱 HTML을 React 컴포넌트로 변환
7. `npm run dev`로 로컬 실행 확인

### /deploy - Vercel 배포

**0. 배포 전 비밀값 노출 검사 (필수, 건너뛰지 마세요)**

먼저 `.gitignore`와 `.vercelignore`가 규칙 8의 패턴을 모두 포함하는지 확인하고, 둘 중 하나라도 없거나 빠진 항목이 있으면 자동으로 만들고 추가하세요.

다음으로 프로젝트 루트에서 비밀값 평문 노출 검사를 실행하세요:

```bash
grep -rE "(discord(app)?\.com/api/webhooks/[0-9]+/|sk-[A-Za-z0-9]{20,}|xoxb-[0-9A-Za-z-]+|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=.vercel \
  -l . 2>/dev/null
```

매치된 파일이 1건이라도 나오면 **배포를 즉시 중단**하고 사용자에게 이렇게 안내하세요:

> "배포를 멈췄어요. 다음 파일에 비밀값(Webhook URL, API 키, 토큰)이 평문으로 들어 있어요:
> [파일 목록]
> 이 비밀값들을 즉시 발급처(Discord, Supabase, OpenAI 등)에서 무효화(revoke)하고,
> 새 값을 `.env`와 Vercel 대시보드 Environment Variables에 옮긴 다음 다시 배포할게요."

1. 먼저 로컬에서 빌드가 되는지 확인: `npm run build`. 여기서 에러가 나면 배포도 안 되니 에러를 먼저 고치세요.
2. Vercel 로그인: `npx vercel login` (브라우저가 열리면 Google 계정으로 로그인. 수업용 계정으로 로그인했는지 확인.)
3. 배포 실행: `npx vercel --yes` (질문 없이 자동으로 배포됩니다. URL이 나타나면 성공.)
4. URL을 클릭해서 브라우저에서 확인
5. 핸드폰으로 접속 테스트 (카카오톡 나에게 보내기로 URL 전송)

주의: `npm install -g vercel`은 사용하지 마세요. `npx vercel`이 설치 없이 바로 실행되고, 권한 문제도 없습니다.

배포가 안 되면:
- 빌드 에러: `npm run build`에서 나온 에러 메시지를 읽고 고치세요
- Vercel 로그인 실패: 브라우저에서 vercel.com에 직접 접속해서 Google 계정으로 가입 후 다시 시도
- 빌드는 되는데 배포가 안 되면: `npm run build` 후 dist 폴더를 app.netlify.com/drop 에 드래그앤드롭 (Vercel 대안)

### /add-data - Supabase 연결

1. Supabase 프로젝트 생성 안내 (supabase.com)
2. `.env` 파일에 키 설정
3. Supabase 클라이언트 초기화
4. 퀴즈 데이터를 Supabase에 저장
5. 앱에서 Supabase 데이터 불러오기

---

## 모델을 위한 참고사항

- 이 파일은 자동으로 읽혀요. 다른 규칙보다 이 파일을 우선하세요.
- 규칙끼리 충돌하면, 뭘 포기했는지 사용자에게 솔직하게 말하세요.
- React + Vite 구조를 사용하세요 (`src/` 디렉토리, `App.tsx`, `main.tsx`).
- 파일 확장자는 `.tsx` / `.ts`를 사용하세요.
- 환경변수 접두사는 `VITE_`를 사용하세요. 단 `VITE_` 접두사는 **클라이언트 번들에 평문으로 박힙니다** - 브라우저 devtools에서 누구나 볼 수 있습니다. 따라서 Webhook URL, Service Role Key 같은 진짜 비밀값에는 절대 사용하지 마세요. 진짜 비밀값은 `api/` 폴더의 서버리스 함수에서 일반 환경변수(`process.env.X`)로만 읽으세요.
- 개발 서버 주소는 `localhost:5173`이에요.
- vite.config.ts에 `server: { host: '127.0.0.1' }`을 넣으면 Windows 방화벽 팝업이 안 뜹니다. 프로젝트 생성 시 자동으로 넣어주세요.
- 파일 저장은 Supabase Storage를 사용하세요.
- npm 명령어를 체인하지 마세요 (`&&`로 연결 금지). 한 줄씩 실행하고 결과를 확인한 뒤 다음으로 넘어가세요.
- 배포는 `npx vercel --yes`를 사용하세요. `npm install -g vercel`은 사용하지 마세요.

---

## Windows 문제 해결

사용자가 Windows를 쓰고 있고 에러가 나면, 아래에서 해당하는 증상을 찾아 안내하세요.

### "winget을 찾을 수 없습니다"

winget이 설치 안 된 컴퓨터예요. nodejs.org 사이트에 접속해서 LTS 버전 다운로드 버튼을 클릭하고, 설치 파일을 실행하라고 안내하세요. 설치할 때 뜨는 옵션은 전부 기본값으로 "Next"만 누르면 됩니다.

### "node(npm)은(는) 내부 또는 외부 명령이 아닙니다"

Node.js를 설치했는데 터미널을 안 껐다 켠 거예요. 해결 방법:
1. 지금 열려 있는 터미널(PowerShell)을 X 버튼으로 완전히 닫기
2. 새로 PowerShell 열기
3. `node -v` 다시 입력
4. 그래도 안 되면 컴퓨터를 재시작하라고 안내

### "이 시스템에서 스크립트를 실행할 수 없습니다" (실행 정책 에러)

PowerShell의 보안 설정 때문이에요. 해결 방법:
1. PowerShell을 오른쪽 클릭해서 "관리자 권한으로 실행"
2. `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` 입력
3. "Y" 입력
4. 관리자 PowerShell을 닫고, 일반 PowerShell에서 다시 시도

### npm install 중 "EPERM" 또는 "permission denied"

관리자 권한이 필요한 거예요. 해결 방법:
1. 지금 터미널을 닫기
2. PowerShell을 오른쪽 클릭 -> "관리자 권한으로 실행"
3. `cd` 명령으로 프로젝트 폴더로 이동한 뒤 다시 시도
4. 글로벌 설치(`-g`)에서 에러가 나면 `npx`로 대체 (예: `npm install -g vercel` 대신 `npx vercel`)

### npm install 중 경로에 한글이 있어서 에러

에러 메시지에 깨진 글자(?????)나 "Invalid character" 같은 게 보이면 폴더 이름에 한글이 있는 거예요. 해결 방법:
1. `C:\Projects\` 폴더를 새로 만들기 (영어로)
2. 그 안에서 프로젝트를 다시 시작

사용자에게 이렇게 안내하세요:
> "프로젝트 폴더를 영어 이름으로 바꿔야 해요. C 드라이브 바로 아래에 Projects 폴더를 만들고 거기서 시작할까요?"

### localhost:5173에 접속이 안 됨

`npm run dev`는 성공했는데 브라우저에서 localhost:5173이 안 열리는 경우:
1. Windows 방화벽 팝업이 떴는데 "차단"을 눌렀을 수 있어요. 해결: `npm run dev`를 Ctrl+C로 멈추고 다시 실행. 팝업이 뜨면 "허용"을 클릭.
2. 팝업이 안 뜨면: 브라우저 주소창에 `http://127.0.0.1:5173`을 직접 입력해보세요 (localhost 대신 127.0.0.1).
3. 그래도 안 되면: 다른 프로그램이 5173 포트를 쓰고 있을 수 있어요. `npm run dev -- --port 3000`으로 포트를 바꿔서 실행하세요.

### 위 목록에 없는 에러

에러 메시지를 그대로 복사해서 보여달라고 하세요. 에러 메시지 전체를 읽고, 원인을 추측해서 안내하세요. 추측이 안 되면 솔직하게 이렇게 말하세요:
> "이 에러는 제가 바로 해결하기 어려워요. 에러 메시지를 강사님께 보여드리세요."

### .env 파일규칙
.env 파일을 만들거나 수정할 때 반드시 터미널 명령어를 사용한다.
에이전트 파일 생성 도구(file write)로 .env를 만들지 않는다.
