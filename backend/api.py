from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import datetime as dt
import logging
from typing import List, Dict, Any
import requests

# Import functions from the original app
from receipt_parser import (
    CATEGORIES, STAT_RULES, DEFAULT_STATS,
    load_stats, save_stats, apply_stat_rules,
    lm_call, parse_receipt, normalize_category,
    get_weaviate_client, ensure_schema, insert_items, query_items,
    summarize
)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Structured logging so we can trace incoming requests/actions.
logging.basicConfig(
    level=os.getenv("FLASK_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Configuration
LM_ENDPOINT = os.getenv("LM_ENDPOINT", "http://localhost:1234")
LM_MODEL = os.getenv("LM_MODEL", "qwen3-vl-8b-instruct-mlx")
WEAVIATE_DATA = os.getenv("WEAVIATE_DATA_PATH", "./weaviate_data")

# Initialize Weaviate client (falls back to JSON store if unavailable)
client = get_weaviate_client(WEAVIATE_DATA)
if client is not None:
    ensure_schema(client)
else:
    print("[api] Using JSON fallback store (embedded Weaviate unavailable).")


# ===================== API ENDPOINTS =====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Receipt API is running"})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get current RPG stats"""
    try:
        stats = load_stats()
        return jsonify({
            "zdravie": stats["zdravie"],
            "stastie": stats["stastie"],
            "history": stats.get("history", [])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/parse-receipt', methods=['POST'])
def parse_receipt_endpoint():
    """Parse receipt text and return structured items"""
    try:
        data = request.json
        receipt_text = data.get('text', '')
        logger.info("parse-receipt: %s payload chars=%d", request.remote_addr, len(receipt_text))
        
        if not receipt_text.strip():
            return jsonify({"error": "Receipt text is required"}), 400
        
        # Parse receipt using LLM
        items = parse_receipt(receipt_text, LM_ENDPOINT, LM_MODEL)
        logger.info("parse-receipt: parsed %d items", len(items))
        
        if not items:
            return jsonify({"error": "No items could be parsed from the receipt"}), 400
        
        # Calculate stat changes
        total_health = 0
        total_happiness = 0
        for item in items:
            rule = STAT_RULES.get(item["category"], {"health": 0, "happiness": 0})
            total_health += rule["health"]
            total_happiness += rule["happiness"]
        
        return jsonify({
            "items": items,
            "stat_changes": {
                "health": total_health,
                "happiness": total_happiness
            }
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/save-receipt', methods=['POST'])
def save_receipt_endpoint():
    """Save parsed receipt items to database and update stats"""
    try:
        data = request.json
        items = data.get('items', [])
        raw_text = data.get('raw_text', '')
        date_str = data.get('date', dt.datetime.now().isoformat())
        logger.info("save-receipt: %s items=%d", request.remote_addr, len(items))
        
        if not items:
            return jsonify({"error": "No items to save"}), 400
        
        # Parse date
        try:
            receipt_date = dt.datetime.fromisoformat(date_str)
        except:
            receipt_date = dt.datetime.now()
        
        # Insert to Weaviate
        insert_items(client, items, raw_text, receipt_date)
        logger.info("save-receipt: stored %d items dated %s", len(items), receipt_date.isoformat())
        
        # Update RPG stats
        dh, ds, new_stats = apply_stat_rules(items, receipt_date)
        
        return jsonify({
            "success": True,
            "items_saved": len(items),
            "stat_changes": {
                "health": dh,
                "happiness": ds
            },
            "new_stats": {
                "zdravie": new_stats["zdravie"],
                "stastie": new_stats["stastie"]
            }
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/receipts', methods=['POST'])
def get_receipts():
    """Get all receipts from database"""
    try:
        limit = request.args.get('limit', 500, type=int)
        items = query_items(client, limit=limit)
        
        # Group items by receipt_text to get unique receipts
        receipts = {}
        for item in items:
            receipt_text = item.get('receipt_text', '')
            if receipt_text not in receipts:
                receipts[receipt_text] = {
                    "id": str(hash(receipt_text)),
                    "date": item.get('datetime', ''),
                    "items": [],
                    "total": 0,
                    "category": item.get('category', 'other')
                }
            receipts[receipt_text]["items"].append({
                "name": item.get('product', ''),
                "price": item.get('price', 0),
                "quantity": 1,
                "category": item.get('category', '')
            })
            receipts[receipt_text]["total"] += item.get('price', 0)
        
        return jsonify({"receipts": list(receipts.values())})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    """Chat with the financial assistant"""
    try:
        data = request.json
        question = data.get('question', '')
        
        if not question.strip():
            return jsonify({"error": "Question is required"}), 400
        
        # Get all items
        all_items = query_items(client)
        
        # Generate answer
        answer = summarize(question, all_items, LM_ENDPOINT, LM_MODEL)
        
        return jsonify({
            "answer": answer,
            "items_count": len(all_items)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get available categories"""
    return jsonify({"categories": CATEGORIES})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
