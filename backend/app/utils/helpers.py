import re
import unicodedata


def slugify(text, max_length=150):
    text = unicodedata.normalize("NFKD", str(text))
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[-\s]+", "-", text)
    return text[:max_length].strip("-")


def generate_order_number():
    from datetime import datetime
    import secrets
    stamp = datetime.now().strftime("%Y%m%d")
    return f"ORD-{stamp}-{secrets.randbelow(900000) + 100000}"


def ok(data=None, status=200, message=None):
    payload = {"ok": True, "data": data}
    if message:
        payload["message"] = message
    return payload, status


def error(message="Error", status=400, errors=None):
    payload = {"ok": False, "message": message}
    if errors:
        payload["errors"] = errors
    return payload, status


def money(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def parse_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).lower() in ("1", "true", "yes", "on")
