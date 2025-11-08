"""
Receipt parser logic extracted from app.py for use in Flask API
"""
import os
import json
import datetime as dt
from pathlib import Path
from typing import List, Dict, Any, Optional
import threading
from urllib.parse import urlparse
import requests

# ===================== WEAVIATE SETUP =====================
try:
    import weaviate
    from weaviate import connect
    from weaviate.auth import AuthApiKey
    from weaviate.classes.config import Property, DataType
    from weaviate.embedded import EmbeddedOptions
    WEAVIATE_OK = True
except Exception as e:
    WEAVIATE_OK = False
    _weaviate_import_error = e
    AuthApiKey = None


_fallback_lock = threading.Lock()
FALLBACK_DATA_FILE = Path("weaviate_fallback.json")

# Default remote Weaviate location (static IP + ports requested)
DEFAULT_REMOTE_HTTP_HOST = "172.20.10.7"
DEFAULT_REMOTE_HTTP_PORT = 8080
DEFAULT_REMOTE_HTTP_SECURE = False
DEFAULT_REMOTE_GRPC_HOST = DEFAULT_REMOTE_HTTP_HOST
DEFAULT_REMOTE_GRPC_PORT = 50051
DEFAULT_REMOTE_GRPC_SECURE = False
    
# ===================== CATEGORY SYSTEM =====================
CATEGORIES = [
    "healthy food, vegetables and fruits",
    "unhealthy food, snacks", 
    "drinks alcoholic",
    "drinks nonalcoholic",
    "grocery",
    "hygiene and cosmetics",
    "medicines and health",
    "clothing and shoes",
    "toys, fun, entertainment",
    "home and furniture", 
    "electronics and technology",
    "transportation and fuel",
    "books, education and stationery",
    "sports and outdoor",
    "pet care",
    "garden and plants",
    "home maintenance and repairs",
    "services and subscriptions",
    "restaurants and dining out",
    "travel and accommodation",
    "events and tickets",
    "gifts and special occasions",
    "beauty and personal care services",
    "jewelry and accessories",
    "baby and child care",
    "other"
]


# ===================== RPG STAT RULES =====================
STATS_FILE = "stats.json"

DEFAULT_STATS = {
    "zdravie": 100,
    "stastie": 100,
    "history": []
}

STAT_RULES = {
    "healthy food, vegetables and fruits":       {"health": +10, "happiness": +5},
    "unhealthy food, snacks":                    {"health": -10, "happiness": -10},
    "drinks alcoholic":                          {"health": -20, "happiness": -10},
    "drinks nonalcoholic":                       {"health": -5,  "happiness": +5},
    "grocery":                                   {"health": 0,   "happiness": 0},
    "hygiene and cosmetics":                     {"health": +10, "happiness": 0},
    "medicines and health":                      {"health": +10, "happiness": 0},
    "clothing and shoes":                        {"health": 0,   "happiness": 0},
    "toys, fun, entertainment":                  {"health": 0,   "happiness": +10},
    "home and furniture":                        {"health": 0,   "happiness": +5},
    "electronics and technology":                {"health": -5,  "happiness": +5},
    "transportation and fuel":                   {"health": 0,   "happiness": 0},
    "books, education and stationery":           {"health": +5,  "happiness": +10},
    "sports and outdoor":                        {"health": +5,  "happiness": +5},
    "pet care":                                  {"health": 0,   "happiness": 0},
    "garden and plants":                         {"health": 0,   "happiness": 0},
    "home maintenance and repairs":              {"health": 0,   "happiness": 0},
    "services and subscriptions":                {"health": 0,   "happiness": 0},
    "restaurants and dining out":                {"health": 0,   "happiness": +5},
    "travel and accommodation":                  {"health": 0,   "happiness": +5},
    "events and tickets":                        {"health": 0,   "happiness": +5},
    "gifts and special occasions":               {"health": 0,   "happiness": +5},
    "beauty and personal care services":         {"health": +5,  "happiness": 0},
    "jewelry and accessories":                   {"health": 0,   "happiness": +5},
    "baby and child care":                       {"health": 0,   "happiness": 0},
    "other":                                     {"health": 0,   "happiness": 0}
}


def load_stats():
    if not os.path.exists(STATS_FILE):
        save_stats(DEFAULT_STATS)
    with open(STATS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_stats(stats):
    with open(STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)


def apply_stat_rules(items, date):
    stats = load_stats()
    total_h = 0
    total_s = 0

    for item in items:
        cat = item["category"]
        rule = STAT_RULES.get(cat)
        if rule:
            dh = rule["health"]
            ds = rule["happiness"]
            total_h += dh
            total_s += ds

            stats["history"].append({
                "date": date.isoformat(),
                "item": item["product"],
                "category": cat,
                "health": dh,
                "happiness": ds
            })

    stats["zdravie"] = max(0, min(100, stats["zdravie"] + total_h))
    stats["stastie"] = max(0, min(100, stats["stastie"] + total_s))
    save_stats(stats)

    return total_h, total_s, stats


# ===================== LM STUDIO CALLER =====================
def lm_call(messages, endpoint, model, temperature=0.0, timeout=300):
    url = endpoint.rstrip('/') + "/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": model,
        "temperature": temperature,
        "messages": messages,
        "max_tokens": 350,
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"(LM Studio error: {e})"


def normalize_category(cat_input):
    """Normalize category to match exact strings from CATEGORIES list"""
    if not cat_input:
        return "other"
    
    cat_lower = cat_input.lower().strip()
    
    # Direct match
    if cat_lower in CATEGORIES:
        return cat_lower
    
    # Fuzzy match
    for valid_cat in CATEGORIES:
        if cat_lower in valid_cat or valid_cat in cat_lower:
            return valid_cat
    
    return "other"


# ===================== PARSE RECEIPT TO JSON =====================
def parse_receipt(text, endpoint, model):
    prompt = f"""
Extract a JSON list of items from this text.
Each item must have: product (string), price (number), category (string).
Choose category EXACTLY from this list:
{json.dumps(CATEGORIES, indent=2)}

Return ONLY a JSON array like:
[{{"product": "bread", "price": 1.5, "category": "grocery"}}, ...]

Text:
{text}
"""

    out = lm_call(
        messages=[
            {"role":"system","content":"You are a JSON extractor. Return ONLY valid JSON array, no markdown, no explanation."},
            {"role":"user","content":prompt}
        ],
        endpoint=endpoint,
        model=model
    )
    
    # Try to extract JSON from markdown code blocks
    if "```" in out:
        parts = out.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("[") or part.startswith("{"):
                try:
                    parsed = json.loads(part)
                    if isinstance(parsed, list):
                        for item in parsed:
                            if "category" in item:
                                item["category"] = normalize_category(item["category"])
                        return parsed
                    elif isinstance(parsed, dict) and "items" in parsed:
                        items = parsed["items"]
                        for item in items:
                            if "category" in item:
                                item["category"] = normalize_category(item["category"])
                        return items
                except:
                    continue
    
    # Try direct parsing
    try:
        parsed = json.loads(out)
        if isinstance(parsed, list):
            for item in parsed:
                if "category" in item:
                    item["category"] = normalize_category(item["category"])
            return parsed
        elif isinstance(parsed, dict) and "items" in parsed:
            items = parsed["items"]
            for item in items:
                if "category" in item:
                    item["category"] = normalize_category(item["category"])
            return items
    except:
        pass
    
    return []


# ===================== WEAVIATE FUNCTIONS =====================
CLASS_NAME = "ReceiptItem"

def get_weaviate_client(data_path):
    """Return Weaviate client if available, otherwise None (fallback to JSON store)."""
    global FALLBACK_DATA_FILE
    FALLBACK_DATA_FILE = Path(data_path) / "fallback_receipts.json"
    FALLBACK_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    if not WEAVIATE_OK:
        return None

    remote_cfg = _resolve_remote_cfg()
    if remote_cfg:
        try:
            client = _connect_remote_weaviate(remote_cfg)
            client.connect()
            return client
        except Exception as exc:
            print(f"[receipt_parser] Remote Weaviate unavailable, falling back to embedded/JSON: {exc}")

    try:
        client = weaviate.WeaviateClient(
            embedded_options=EmbeddedOptions(persistence_data_path=data_path)
        )
        client.connect()
        return client
    except Exception as exc:
        # Embedded Weaviate cannot start in this environment (no sockets). Use fallback.
        print(f"[receipt_parser] Embedded Weaviate unavailable, switching to JSON store: {exc}")
        return None


def _resolve_remote_cfg() -> Optional[dict]:
    if _str_to_bool(os.getenv("WEAVIATE_REMOTE_DISABLED"), default=False):
        return None

    base_url = os.getenv("WEAVIATE_URL")
    http_host = os.getenv("WEAVIATE_HTTP_HOST", DEFAULT_REMOTE_HTTP_HOST)
    http_port = os.getenv("WEAVIATE_HTTP_PORT")

    host = DEFAULT_REMOTE_HTTP_HOST
    port = DEFAULT_REMOTE_HTTP_PORT
    secure = DEFAULT_REMOTE_HTTP_SECURE

    if base_url:
        if "://" not in base_url:
            base_url = f"http://{base_url}"
        parsed = urlparse(base_url)
        host = parsed.hostname or host
        secure = parsed.scheme == "https"
        if parsed.port:
            port = parsed.port
        elif secure:
            port = 443
    if http_host:
        host = http_host
    if http_port:
        try:
            port = int(http_port)
        except ValueError:
            pass
    secure = _str_to_bool(os.getenv("WEAVIATE_HTTP_SECURE"), default=secure)

    grpc_host = os.getenv("WEAVIATE_GRPC_HOST", DEFAULT_REMOTE_GRPC_HOST)
    grpc_port = os.getenv("WEAVIATE_GRPC_PORT")
    if grpc_port:
        try:
            grpc_port_val = int(grpc_port)
        except ValueError:
            grpc_port_val = DEFAULT_REMOTE_GRPC_PORT
    else:
        grpc_port_val = DEFAULT_REMOTE_GRPC_PORT
    grpc_secure = _str_to_bool(
        os.getenv("WEAVIATE_GRPC_SECURE"),
        default=DEFAULT_REMOTE_GRPC_SECURE,
    )

    return {
        "http_host": host,
        "http_port": port,
        "http_secure": secure,
        "grpc_host": grpc_host,
        "grpc_port": grpc_port_val,
        "grpc_secure": grpc_secure,
        "api_key": os.getenv("WEAVIATE_API_KEY"),
    }


def _connect_remote_weaviate(cfg: dict):
    http_params = connect.ProtocolParams(
        host=cfg["http_host"],
        port=int(cfg["http_port"]),
        secure=cfg["http_secure"],
    )
    grpc_params = connect.ProtocolParams(
        host=cfg["grpc_host"],
        port=int(cfg["grpc_port"]),
        secure=cfg["grpc_secure"],
    )
    conn_params = connect.ConnectionParams(http=http_params, grpc=grpc_params)
    auth = None
    api_key = cfg.get("api_key")
    if api_key and AuthApiKey is not None:
        auth = AuthApiKey(api_key=api_key)
    return weaviate.WeaviateClient(
        connection_params=conn_params,
        auth_client_secret=auth,
    )


def _str_to_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def ensure_schema(client):
    if client is None:
        return
    if not client.collections.exists(CLASS_NAME):
        client.collections.create(
            name=CLASS_NAME,
            properties=[
                Property(name="product", data_type=DataType.TEXT),
                Property(name="category", data_type=DataType.TEXT),
                Property(name="price", data_type=DataType.NUMBER),
                Property(name="currency", data_type=DataType.TEXT),
                Property(name="datetime", data_type=DataType.DATE),
                Property(name="health_delta", data_type=DataType.NUMBER),
                Property(name="happiness_delta", data_type=DataType.NUMBER),
                Property(name="receipt_text", data_type=DataType.TEXT)
            ]
        )


def insert_items(client, items, raw, date):
    if date.tzinfo is None:
        date = date.replace(tzinfo=dt.timezone.utc)

    if client is None:
        _fallback_insert(items, raw, date)
        return

    col = client.collections.get(CLASS_NAME)

    with col.batch.dynamic() as batch:
        for it in items:
            rule = STAT_RULES.get(it["category"], {"health": 0, "happiness": 0})
            batch.add_object(properties={
                "product": it["product"],
                "category": it["category"],
                "price": float(it["price"]),
                "currency": "EUR",
                "datetime": date.isoformat(),
                "health_delta": rule["health"],
                "happiness_delta": rule["happiness"],
                "receipt_text": raw
            })


def query_items(client, limit=500):
    if client is None:
        return _fallback_query(limit)
    col = client.collections.get(CLASS_NAME)
    res = col.query.fetch_objects(limit=limit)
    return [o.properties for o in res.objects]


def _fallback_insert(items, raw, date):
    payload = []
    for it in items:
        rule = STAT_RULES.get(it["category"], {"health": 0, "happiness": 0})
        payload.append({
            "product": it["product"],
            "category": it["category"],
            "price": float(it["price"]),
            "currency": "EUR",
            "datetime": date.isoformat(),
            "health_delta": rule["health"],
            "happiness_delta": rule["happiness"],
            "receipt_text": raw
        })

    with _fallback_lock:
        existing = _fallback_query_raw()
        existing.extend(payload)
        with open(FALLBACK_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2)


def _fallback_query(limit):
    with _fallback_lock:
        data = _fallback_query_raw()
    return data[:limit]


def _fallback_query_raw():
    if not FALLBACK_DATA_FILE.exists():
        return []
    try:
        with open(FALLBACK_DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


# ===================== SUMMARIZE =====================
def summarize(question, items, endpoint, model):
    if not items:
        return "Nemám žiadne záznamy o nákupoch, skús pridať bločky."
    lines = [f"- {it['product']} ({it['category']}) {it['price']}€ | H:{it.get('health_delta')} S:{it.get('happiness_delta')}" for it in items]
    text = "\n".join(lines)

    prompt = f"""
Otázka používateľa: "{question}"

Nákupy:
{text}

ÚLOHA: Odpovedz po slovensky, ako keby si bol priateľský tutor pre deti. 
Buď stručný (2-4 vety), vysvetli čo sa kupovalo, aké návyky z toho vidíme
a pridaj drobný tip. Neopakuj zadanie ani technické údaje.
"""

    return lm_call(
        messages=[
            {
                "role": "system",
                "content": "Si finančný sprievodca pre deti. Odpovedaj len po slovensky, láskavo, stručne a poučne.",
            },
            {"role": "user", "content": prompt},
        ],
        endpoint=endpoint,
        model=model
    )
