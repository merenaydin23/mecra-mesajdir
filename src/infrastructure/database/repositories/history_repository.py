# -*- coding: utf-8 -*-
"""
JSON tabanlı Analiz / Benchmark Geçmişi Deposu
==============================================
MSSQL olmadan da arama geçmişi ve benchmark sonuçlarını saklar.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional


class HistoryRepository:
    """data/history_storage.json üzerinde geçmiş yönetimi."""

    def __init__(self, storage_path: Optional[str] = None):
        root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
        default = os.path.join(root, "data", "history_storage.json")
        self.path = storage_path or default
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        if not os.path.exists(self.path):
            self._write({"analyses": [], "benchmarks": []})

    def _read(self) -> Dict[str, Any]:
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "analyses" not in data:
                data["analyses"] = []
            if "benchmarks" not in data:
                data["benchmarks"] = []
            return data
        except Exception:
            return {"analyses": [], "benchmarks": []}

    def _write(self, data: Dict[str, Any]) -> None:
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def save_analysis(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        data = self._read()
        record = {
            "id": str(uuid.uuid4())[:8],
            "type": "analysis",
            "created_at": datetime.now().isoformat(timespec="seconds"),
            **entry,
        }
        data["analyses"].insert(0, record)
        data["analyses"] = data["analyses"][:50]
        self._write(data)
        return record

    def save_benchmark(self, report: Dict[str, Any]) -> Dict[str, Any]:
        data = self._read()
        record = {
            "id": str(uuid.uuid4())[:8],
            "type": "benchmark",
            "created_at": datetime.now().isoformat(timespec="seconds"),
            "overall_accuracy": report.get("overall_accuracy"),
            "grade": report.get("grade"),
            "summary": report.get("summary"),
            "report": report,
        }
        data["benchmarks"].insert(0, record)
        data["benchmarks"] = data["benchmarks"][:20]
        self._write(data)
        return record

    def list_all(self, limit: int = 30) -> List[Dict[str, Any]]:
        data = self._read()
        items: List[Dict[str, Any]] = []
        for a in data.get("analyses", []):
            items.append({
                "id": a.get("id"),
                "type": "analysis",
                "created_at": a.get("created_at"),
                "core_message": a.get("core_message", "")[:120],
                "platform_count": len(a.get("platforms", [])),
            })
        for b in data.get("benchmarks", []):
            items.append({
                "id": b.get("id"),
                "type": "benchmark",
                "created_at": b.get("created_at"),
                "overall_accuracy": b.get("overall_accuracy"),
                "grade": b.get("grade"),
                "summary": b.get("summary", "")[:160],
            })
        items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return items[:limit]

    def get(self, item_id: str) -> Optional[Dict[str, Any]]:
        data = self._read()
        for a in data.get("analyses", []):
            if a.get("id") == item_id:
                return a
        for b in data.get("benchmarks", []):
            if b.get("id") == item_id:
                return b
        return None

    def clear(self) -> None:
        self._write({"analyses": [], "benchmarks": []})
