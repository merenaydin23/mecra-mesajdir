# -*- coding: utf-8 -*-
"""
Altın Standart Doğruluk Değerlendiricisi
========================================
Colab algoritma çıktılarını beklenen etiketlerle kıyaslar.
Algoritma mantığına DOKUNMAZ — sadece ölçer.
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from src.domain.entities.message import CoreMessage, TransformedMessage
from src.infrastructure.analyzers.semantic_info_loss_analyzer import SemanticAndInfoLossAnalyzer
from src.infrastructure.benchmark.gold_scenarios import GOLD_SCENARIOS, AMBIGUITY_RANK


class BenchmarkEvaluator:
    """5 altın senaryoyu çalıştırır, doğruluk yüzdesini hesaplar."""

    def __init__(self, analyzer: Optional[SemanticAndInfoLossAnalyzer] = None):
        self.analyzer = analyzer or SemanticAndInfoLossAnalyzer()

    @staticmethod
    def _check_expectation(actual: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        checks = []

        # 1. Bilgi kaybı
        if "info_loss" in expected:
            ok = actual["info_loss"] == expected["info_loss"]
            checks.append({
                "metric": "info_loss",
                "expected": expected["info_loss"],
                "actual": actual["info_loss"],
                "pass": ok,
            })

        # 2. Konu korunumu
        if "topic_preserved" in expected:
            ok = actual["topic_preserved"] == expected["topic_preserved"]
            checks.append({
                "metric": "topic_preserved",
                "expected": expected["topic_preserved"],
                "actual": actual["topic_preserved"],
                "pass": ok,
            })

        # 3. Benzerlik alt sınır
        if "sim_min" in expected:
            ok = actual["sim"] >= expected["sim_min"]
            checks.append({
                "metric": "sim_min",
                "expected": f">={expected['sim_min']}",
                "actual": actual["sim"],
                "pass": ok,
            })

        # 4. Benzerlik üst sınır (kayıp senaryolar)
        if "sim_max" in expected:
            ok = actual["sim"] <= expected["sim_max"]
            checks.append({
                "metric": "sim_max",
                "expected": f"<={expected['sim_max']}",
                "actual": actual["sim"],
                "pass": ok,
            })

        # 5. CTA varlığı
        if "has_cta" in expected:
            ok = actual["has_cta"] == expected["has_cta"]
            checks.append({
                "metric": "has_cta",
                "expected": expected["has_cta"],
                "actual": actual["has_cta"],
                "pass": ok,
            })

        # 6. Belirsizlik üst sınır
        if "ambiguity_max" in expected:
            ok = AMBIGUITY_RANK.get(actual["ambiguity"], 1) <= AMBIGUITY_RANK.get(expected["ambiguity_max"], 1)
            checks.append({
                "metric": "ambiguity_max",
                "expected": f"<={expected['ambiguity_max']}",
                "actual": actual["ambiguity"],
                "pass": ok,
            })

        # 7. Belirsizlik alt sınır
        if "ambiguity_min" in expected:
            ok = AMBIGUITY_RANK.get(actual["ambiguity"], 1) >= AMBIGUITY_RANK.get(expected["ambiguity_min"], 1)
            checks.append({
                "metric": "ambiguity_min",
                "expected": f">={expected['ambiguity_min']}",
                "actual": actual["ambiguity"],
                "pass": ok,
            })

        # 8. Sentiment
        if "sentiment" in expected:
            ok = actual["sentiment"] == expected["sentiment"]
            checks.append({
                "metric": "sentiment",
                "expected": expected["sentiment"],
                "actual": actual["sentiment"],
                "pass": ok,
            })

        # 9. Intensity Min
        if "intensity_min" in expected:
            ok = actual["intensity"] >= expected["intensity_min"]
            checks.append({
                "metric": "intensity_min",
                "expected": f">={expected['intensity_min']}",
                "actual": actual["intensity"],
                "pass": ok,
            })

        # 10. Intensity Max
        if "intensity_max" in expected:
            ok = actual["intensity"] <= expected["intensity_max"]
            checks.append({
                "metric": "intensity_max",
                "expected": f"<={expected['intensity_max']}",
                "actual": actual["intensity"],
                "pass": ok,
            })

        passed = sum(1 for c in checks if c["pass"])
        total = len(checks) or 1
        return {
            "checks": checks,
            "passed": passed,
            "total": total,
            "accuracy": round(100.0 * passed / total, 1),
        }

    async def run(self) -> Dict[str, Any]:
        """Tüm altın senaryoları çalıştırır ve rapor üretir."""
        scenario_reports: List[Dict[str, Any]] = []
        total_pass = 0
        total_checks = 0

        for scenario in GOLD_SCENARIOS:
            core = CoreMessage(content=scenario["core"], author="Benchmark")
            platform_results = []

            for channel, text in scenario["platforms"].items():
                transformed = TransformedMessage(
                    channel=channel,
                    original_content=scenario["core"],
                    transformed_content=text,
                )
                res = await self.analyzer.analyze_pair(core, transformed)

                actual = {
                    "sim": res.semantic_similarity.semantic_similarity_percentage,
                    "topic_preserved": res.semantic_similarity.topic_preserved,
                    "info_loss": res.info_loss.info_loss_occurred,
                    "info_loss_rate": res.info_loss.info_loss_rate,
                    "has_cta": res.cta.has_cta,
                    "cta_strength": res.cta.strength_text,
                    "sentiment": res.sentiment.label,
                    "intensity": res.sentiment.intensity_score,
                    "ambiguity": res.ambiguity.level,
                    "ambiguity_score": res.ambiguity.ambiguity_score,
                }

                expected = scenario["expected"].get(channel, {})
                score = self._check_expectation(actual, expected)
                total_pass += score["passed"]
                total_checks += score["total"]

                platform_results.append({
                    "channel": channel.value,
                    "channel_name": res.channel_name,
                    "transformed_content": text,
                    "actual": actual,
                    "expected": {
                        k: (v.value if hasattr(v, "value") else v)
                        for k, v in expected.items()
                    },
                    "score": score,
                })

            scen_pass = sum(p["score"]["passed"] for p in platform_results)
            scen_total = sum(p["score"]["total"] for p in platform_results)
            scen_acc = round(100.0 * scen_pass / scen_total, 1) if scen_total else 0.0

            scenario_reports.append({
                "id": scenario["id"],
                "name": scenario["name"],
                "core": scenario["core"],
                "platforms": platform_results,
                "passed": scen_pass,
                "total": scen_total,
                "accuracy": scen_acc,
            })

        overall = round(100.0 * total_pass / total_checks, 1) if total_checks else 0.0

        # Bozulma zinciri hızlı duman testi (T1 zinciri)
        degradation_ok = await self._smoke_degradation()

        return {
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "overall_accuracy": overall,
            "total_passed": total_pass,
            "total_checks": total_checks,
            "grade": self._grade(overall),
            "degradation_smoke": degradation_ok,
            "scenarios": scenario_reports,
            "summary": self._build_summary(scenario_reports, overall),
        }

    async def _smoke_degradation(self) -> Dict[str, Any]:
        """MMD zincirinin çökmeden çalıştığını doğrular."""
        try:
            from src.domain.entities.channel import ChannelType
            core = CoreMessage(content=GOLD_SCENARIOS[0]["core"], author="Benchmark")
            texts = [
                TransformedMessage(
                    channel=ch,
                    original_content=core.content,
                    transformed_content=f"{core.content} ({ch.value})",
                )
                for ch in list(ChannelType)[:4]
            ]
            _, chain = await self.analyzer.analyze_all(core, texts)
            return {
                "ok": True,
                "has_breaking_point": chain.has_breaking_point,
                "max_deviation": chain.max_consecutive_deviation,
                "steps": len(chain.steps),
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}

    @staticmethod
    def _grade(acc: float) -> str:
        if acc >= 90:
            return "A+ Üretim Kalitesi"
        if acc >= 80:
            return "A Güçlü"
        if acc >= 70:
            return "B İyi"
        if acc >= 60:
            return "C Kabul Edilebilir"
        return "D Geliştirilmeli"

    @staticmethod
    def _build_summary(scenarios: List[Dict], overall: float) -> str:
        best = max(scenarios, key=lambda s: s["accuracy"]) if scenarios else None
        worst = min(scenarios, key=lambda s: s["accuracy"]) if scenarios else None
        parts = [f"Genel doğruluk %{overall}."]
        if best:
            parts.append(f"En güçlü: {best['name']} (%{best['accuracy']}).")
        if worst:
            parts.append(f"En zayıf: {worst['name']} (%{worst['accuracy']}).")
        return " ".join(parts)
