---
description: "현재 프로젝트의 Claude Code 세션을 인터랙티브하게 선택·삭제합니다"
---

# Claude 명령어: Session Delete

현재 프로젝트의 저장된 세션 목록을 TUI로 표시하고, 선택한 세션을 삭제합니다.

## 사용법

```
/session:delete
```

## 조작 방법

- **↑ / ↓** : 세션 선택 이동
- **Enter** : 선택한 세션 삭제 (확인 프롬프트 표시)
- **y** : 삭제 확인
- **n / ESC** : 삭제 취소
- **q / ESC** : TUI 종료

!python3 "$PWD/.claude/scripts/session-delete.py"
