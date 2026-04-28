#!/usr/bin/env python3
"""
Claude Code → Slack 알림 훅 (프로젝트 전용)
- Notification(permission_prompt): 권한 요청 알림
- Stop: 작업 완료 알림
- SLACK_WEBHOOK_URL은 프로젝트 루트 .env 파일에서 읽음
"""

import json
import os
import sys
import datetime
import urllib.request
import urllib.error


def load_env_file():
  """프로젝트 루트의 .env 파일에서 환경변수 로드"""
  project_root = os.getcwd()
  env = {}
  for filename in [".env.local", ".env"]:
    env_path = os.path.join(project_root, filename)
    try:
      with open(env_path) as f:
        for line in f:
          line = line.strip()
          if not line or line.startswith("#"):
            continue
          if "=" in line:
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip().strip("\"'")
      if env:
        break
    except FileNotFoundError:
      continue
  return env


def now_kst():
  kst_zone = datetime.timezone(datetime.timedelta(hours=9))
  return datetime.datetime.now(kst_zone).strftime("%Y-%m-%d %H:%M:%S KST")


def extract_path(transcript_path):
  """transcript_path에서 프로젝트 경로 추출"""
  if not transcript_path:
    return "알 수 없음"
  parts = transcript_path.split("/")
  for i, part in enumerate(parts):
    if part == "projects" and i + 1 < len(parts):
      encoded = parts[i + 1]
      return "/" + encoded.replace("-", "/").lstrip("/")
  return transcript_path


def send_slack(webhook_url, payload):
  data = json.dumps(payload).encode("utf-8")
  req = urllib.request.Request(
    webhook_url,
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST",
  )
  try:
    with urllib.request.urlopen(req, timeout=10) as resp:
      if resp.status != 200:
        print(f"[slack-notify] Slack 응답 오류: {resp.status}", file=sys.stderr)
  except urllib.error.URLError as e:
    print(f"[slack-notify] HTTP 요청 실패: {e}", file=sys.stderr)


def build_permission_payload(event):
  message = event.get("message", "(내용 없음)")
  session_id = event.get("session_id", "")
  workspace = extract_path(event.get("transcript_path", ""))
  return {
    "blocks": [
      {
        "type": "header",
        "text": {"type": "plain_text", "text": "⚠️ Claude Code 권한 요청", "emoji": True},
      },
      {
        "type": "section",
        "fields": [
          {"type": "mrkdwn", "text": f"*요청 내용:*\n{message}"},
          {"type": "mrkdwn", "text": f"*작업 경로:*\n`{workspace}`"},
        ],
      },
      {
        "type": "context",
        "elements": [
          {"type": "mrkdwn", "text": f"세션: `{session_id[:8]}...`  |  {now_kst()}"},
        ],
      },
      {"type": "divider"},
    ]
  }


def build_stop_payload(event):
  session_id = event.get("session_id", "")
  workspace = extract_path(event.get("transcript_path", ""))
  return {
    "blocks": [
      {
        "type": "header",
        "text": {"type": "plain_text", "text": "✅ Claude Code 작업 완료", "emoji": True},
      },
      {
        "type": "section",
        "fields": [
          {"type": "mrkdwn", "text": f"*세션 ID:*\n`{session_id}`"},
          {"type": "mrkdwn", "text": f"*작업 경로:*\n`{workspace}`"},
        ],
      },
      {
        "type": "context",
        "elements": [
          {"type": "mrkdwn", "text": f"완료 시각: {now_kst()}"},
        ],
      },
      {"type": "divider"},
    ]
  }


def main():
  # .env 파일 → 환경변수 순으로 SLACK_WEBHOOK_URL 탐색
  env_vars = load_env_file()
  webhook_url = env_vars.get("SLACK_WEBHOOK_URL") or os.environ.get("SLACK_WEBHOOK_URL", "")
  if not webhook_url:
    sys.exit(0)

  try:
    event = json.loads(sys.stdin.read())
  except Exception as e:
    print(f"[slack-notify] stdin 파싱 실패: {e}", file=sys.stderr)
    sys.exit(0)

  hook_event_name = event.get("hook_event_name", "")

  if hook_event_name == "Stop":
    # stop_hook_active=true이면 스킵 (무한 알림 방지)
    if event.get("stop_hook_active", False):
      sys.exit(0)
    payload = build_stop_payload(event)
  elif hook_event_name == "Notification":
    if event.get("notification_type") != "permission_prompt":
      sys.exit(0)
    payload = build_permission_payload(event)
  else:
    sys.exit(0)

  send_slack(webhook_url, payload)
  sys.exit(0)


if __name__ == "__main__":
  main()
