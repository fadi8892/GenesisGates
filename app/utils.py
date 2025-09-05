import os
import json
import urllib.request
import urllib.error

def gen_code(n: int = 6) -> str:
    import random
    return "".join(str(random.randint(0,9)) for _ in range(n))

def send_email_code(to_email: str, code: str):
    """
    Sends a one-time login code using Resend.
    Requires:
      - RESEND_API_KEY
      - MAIL_FROM (e.g., 'GenesisGates <noreply@genesisgates.com>')
    """
    api_key = os.environ.get("RESEND_API_KEY")
    mail_from = os.environ.get("MAIL_FROM", os.environ.get("FROM_EMAIL"))
    if not api_key:
        raise RuntimeError("Missing RESEND_API_KEY")
    if not mail_from:
        raise RuntimeError("Missing MAIL_FROM/FROM_EMAIL")

    subject = "Your GenesisGates login code"
    text = f"Your one-time login code is: {code}\nThis code expires in 10 minutes."
    payload = {
        "from": mail_from,
        "to": [to_email],
        "subject": subject,
        "text": text,
    }

    req = urllib.request.Request(
        url="https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status not in (200, 201, 202):
                body = resp.read().decode("utf-8", errors="ignore")
                raise RuntimeError(f"Resend error: {resp.status} {body}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Resend HTTPError: {e.code} {e.read().decode('utf-8', errors='ignore')}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Resend URLError: {e.reason}")
