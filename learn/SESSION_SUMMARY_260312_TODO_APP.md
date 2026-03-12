# 작업 요약 문서 (2026-03-12)

## 1) 대상 프로젝트
- 경로: `C:\Users\drsgg\OneDrive\Desktop\workspace\2026\ai_260307\todo_app`
- 주요 파일:
  - `server.js`: 정적 파일 서빙용 Node HTTP 서버
  - `app.js`: Todo 상태 관리 및 브라우저 저장 로직
  - `index.html`, `styles.css`: 프론트엔드 UI 파일

## 2) 서버 실행 관련 확인 사항
- 사용자가 원한 기본 실행 명령은 아래와 같음:
  - `cd C:\Users\drsgg\OneDrive\Desktop\workspace\2026\ai_260307\todo_app`
  - `node server.js`
- `node server.js`를 직접 실행했을 때 정상적으로 아래 메시지를 확인함:
  - `Server running at http://localhost:8000/`
- `server.js`는 포트 `8000`에서 현재 디렉터리의 정적 파일을 서빙하는 구조임

## 3) 백그라운드 서버 구동
- 사용자의 요청에 따라 `todo_app` 서버를 백그라운드에서 유지되도록 실행함
- 실행 후 아래 상태를 확인함:
  - `http://localhost:8000/` 응답 코드 `200`
  - 포트 `8000` `LISTENING` 상태 확인
- 서버 재구동도 수행했으며, 기존 PID 종료 후 새 PID로 정상 재시작됨

## 4) 데이터 영속성 판단
- 이 앱의 Todo 데이터는 서버가 아니라 브라우저 `localStorage`에 저장됨
- `app.js`에서 확인한 핵심 로직:
  - `localStorage.getItem(STORAGE_KEY)`로 저장 데이터 로드
  - `localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos))`로 저장
- 따라서 서버를 재구동해도 같은 브라우저와 같은 origin(`http://localhost:8000`)으로 접속하면 기존 Todo 데이터는 유지됨

## 5) 영속성의 한계
- 유지되는 경우:
  - 서버를 껐다 켜도 같은 브라우저에서 `http://localhost:8000`으로 다시 접속할 때
- 유지되지 않을 수 있는 경우:
  - 브라우저 저장소(`localStorage`)를 직접 삭제한 경우
  - 다른 브라우저에서 접속한 경우
  - 포트나 origin이 바뀐 경우
- 즉, 현재 구조는 "브라우저 로컬 영속성"은 있지만, 서버 파일/DB 기반 영속성은 없음

## 6) 대화 중 정리된 핵심 결론
- 이 Todo 앱은 서버가 데이터를 저장하지 않음
- 서버 재구동과 Todo 데이터 유지 여부는 별개이며, 데이터 유지의 핵심은 브라우저 `localStorage`임
- 진짜 서버 측 영속성이 필요하면 JSON 파일 저장, SQLite, 또는 별도 DB 연동이 필요함
