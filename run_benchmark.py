# -*- coding: utf-8 -*-
"""CLI: 5 altın senaryo doğruluk testi + geçmişe kayıt."""

import asyncio
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.infrastructure.benchmark.evaluator import BenchmarkEvaluator
from src.infrastructure.database.repositories.history_repository import HistoryRepository


async def main():
    print("=" * 80)
    print("MECRA MESAJDIR — ALTIN STANDART DOĞRULUK LABORATUVARI")
    print("=" * 80)
    evaluator = BenchmarkEvaluator()
    report = await evaluator.run()
    saved = HistoryRepository().save_benchmark(report)

    print(f"\n🎯 GENEL DOĞRULUK: %{report['overall_accuracy']}")
    print(f"📝 NOT: {report['grade']}")
    print(f"✅ Geçen: {report['total_passed']}/{report['total_checks']}")
    print(f"⛓️  MMD: {report['degradation_smoke']}")
    print(f"💾 Geçmiş ID: {saved['id']}")
    print(f"\n{report['summary']}\n")

    for sc in report["scenarios"]:
        print("-" * 80)
        print(f"📌 {sc['name']}  →  %{sc['accuracy']} ({sc['passed']}/{sc['total']})")
        for p in sc["platforms"]:
            fails = [c["metric"] for c in p["score"]["checks"] if not c["pass"]]
            mark = "OK" if not fails else f"FAIL:{','.join(fails)}"
            a = p["actual"]
            print(
                f"   · {p['channel']:<18} sim=%{a['sim']:<5} kayıp={a['info_loss']} "
                f"cta={a['has_cta']} belirsiz={a['ambiguity']:<6} [{mark}]"
            )

    out = "benchmark_report.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n📄 Detaylı rapor: {out}")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
