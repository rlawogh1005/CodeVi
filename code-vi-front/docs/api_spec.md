# API Specification

> NestJS 백엔드 API 명세 (프론트엔드 연동 기준)
> Base URL: `http://localhost:3000` *(확인 필요)*
> 인증 방식: JWT Bearer Token *(확인 필요)*

---

## 공통 규약

### 요청 헤더
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### 응답 형식 (예상)
```json
{
  "statusCode": 200,
  "message": "success",
  "data": { ... }
}
```

### 에러 형식 (예상)
```json
{
  "statusCode": 400,
  "message": "에러 메시지",
  "error": "Bad Request"
}
```

---

## 1. Auth

### 1.1 회원가입
```
POST /api/auth/signup
```
**Request Body:**
```json
{
  "teamName": "string",
  "jenkinsJobName": "string",
  "password": "string"
}
```
**Response:** 생성된 User 객체 *(스펙 확인 필요)*

---

### 1.2 로그인
```
POST /api/auth/signin
```
**Request Body:**
```json
{
  "teamName": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "accessToken": "string",
  "user": { "id": 1, "teamName": "string" }
}
```

---

### 1.3 Google OAuth 로그인 (리디렉트)
```
GET /api/auth/google/signin
```
- 브라우저 리디렉트 방식
- 프론트엔드에서 `window.location.href`로 이동

---

### 1.4 Google OAuth 콜백
```
GET /api/auth/google/callback
```
- 백엔드가 처리 후 프론트엔드로 리디렉트
- 리디렉트 URL 및 토큰 전달 방식 **확인 필요**

---

### 1.5 출석 체크
```
GET /api/auth/attendance/{classId}/{sessionId}
```
| 파라미터 | 타입 | 설명 |
|---|---|---|
| classId | path | 수업 ID |
| sessionId | path | 세션 ID |

---

## 2. Users

### 2.1 전체 사용자 조회
```
GET /api/api/users
```
> ⚠️ `/api/api/` 이중 prefix 확인 필요

**Response:** User 배열

---

### 2.2 특정 사용자 조회
```
GET /api/api/users/{id}
```

---

### 2.3 사용자 정보 수정
```
PUT /api/api/users/{id}
```
**Request Body:** 수정할 User 필드

---

### 2.4 사용자 삭제
```
DELETE /api/api/users/{id}
```

---

### 2.5 로그아웃
```
POST /api/api/users/logout
```
- JWT 토큰 무효화 또는 클라이언트 측 토큰 삭제

---

## 3. TeamProject

### 3.1 팀 프로젝트 생성
```
POST /api/team-projects
```
**Request Body:**
```json
{
  "teamName": "string",
  "jenkinsJobName": "string"
}
```

---

### 3.2 팀 프로젝트 히스토리 조회
```
GET /api/team-projects/history
```
**Response:** TeamProject + AstSnapshot 빌드 히스토리 목록 *(스펙 확인 필요)*

---

## 4. CodeAnalysis

### 4.1 코드 분석 트리거
```
POST /api/code-analysis
```
**Request Body:** *(스펙 확인 필요)*

---

### 4.2 코드 분석 결과 조회
```
GET /api/code-analysis
```

---

## 5. Metrics

### 5.1 통합 AST 분석
```
POST /api/metrics/analyze
```

---

### 5.2 고전적 지표 계산
```
POST /api/metrics/analyze/classic
```
> Cyclomatic Complexity, Halstead Metrics, Size Metrics

**Request Body:**
```json
{
  "snapshotId": "number"
}
```

---

### 5.3 CK 메트릭 계산
```
POST /api/metrics/analyze/ck
```
> WMC, DIT, NOC, CBO, RFC, LCOM

---

### 5.4 코드 스멜 감지
```
POST /api/metrics/analyze/smells
```

---

### 5.5 순환 복잡도
```
POST /api/metrics/complexity
```

---

### 5.6 Halstead 메트릭
```
POST /api/metrics/halstead
```

---

### 5.7 사이즈 메트릭
```
POST /api/metrics/size
```
> LOC, SLOC, CLOC, NCLOC

---

## 6. AST Data (Relational) — 핵심 시각화 API

### 6.1 AST 데이터 저장 (Jenkins CI에서 호출)
```
POST /api/ast-data/relational
```
> Tree-sitter 파싱 결과를 정규화하여 저장 (Directory→File→Class→Function)

---

### 6.2 전체 AST 스냅샷 목록 조회
```
GET /api/ast-data/relational
```
**Response:**
```json
[
  {
    "id": 1,
    "buildNumber": 42,
    "teamProjectId": 1,
    "createdAt": "2026-03-27T..."
  }
]
```

---

### 6.3 특정 스냅샷 조회 ⭐ 시각화 핵심
```
GET /api/ast-data/relational/{snapshotId}
```
**Response (예상):**
```json
{
  "id": 1,
  "buildNumber": 42,
  "directories": [
    {
      "id": 1,
      "name": "src",
      "parentDirectoryId": null,
      "files": [
        {
          "id": 1,
          "name": "app.ts",
          "classes": [
            {
              "id": 1,
              "name": "AppController",
              "startLine": 10,
              "endLine": 50,
              "functions": [
                {
                  "id": 1,
                  "name": "getHello",
                  "startLine": 15,
                  "endLine": 20
                }
              ]
            }
          ],
          "functions": []
        }
      ]
    }
  ]
}
```
> ⚠️ 실제 응답 구조 확인 후 interface/ 디렉토리에 TypeScript 타입 정의 필요

---

### 6.4 벤치마크 API (성능 비교용)
```
GET /api/ast-data/relational/benchmark/natural-join/{snapshotId}
GET /api/ast-data/relational/benchmark/nested/{snapshotId}
GET /api/ast-data/relational/benchmark/whole-json/{snapshotId}
```

---

## ❓ 미확인 사항 목록

| 항목 | 현황 |
|---|---|
| Base URL | 미확정 (로컬: 3000? 운영 URL?) |
| `/api/api/` 이중 prefix | NestJS global prefix 설정 확인 필요 |
| JWT 만료 시간 및 Refresh Token 전략 | 미확인 |
| Google OAuth 콜백 후 토큰 전달 방식 | 미확인 (쿼리파라미터? 쿠키?) |
| 6.3 응답 JSON 실제 구조 | 가장 중요 — 시각화 노드 구조 결정 |
| Pagination 지원 여부 | 대규모 코드베이스 대응 |
