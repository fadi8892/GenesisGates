import os, smtplib, ssl, random
from email.message import EmailMessage

def gen_code(n: int = 6) -> str:
    return "".join(str(random.randint(0,9)) for _ in range(n))

def send_email_code(to_email: str, code: str):
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER")
    pwd  = os.environ.get("SMTP_PASS")
    mail_from = os.environ.get("MAIL_FROM", user)

    if not all([host, port, user, pwd, mail_from]):
        raise RuntimeError("SMTP environment variables missing")

    msg = EmailMessage()
    msg["Subject"] = "Your GenesisGates login code"
    msg["From"] = mail_from
    msg["To"] = to_email
    msg.set_content(f"Your one-time login code is: {code}\nThis code expires in 10 minutes.")

    context = ssl.create_default_context()
    with smtplib.SMTP(host, port) as s:
        s.starttls(context=context)
        s.login(user, pwd)
        s.send_message(msg)
