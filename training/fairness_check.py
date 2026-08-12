"""
ZKredit — Fairness Checker Module
-----------------------------------
Bonus feature (Section 4.3 of docs): proves ki model ne different demographic
groups ko statistically similar treatment diya — bina individual data reveal kiye.

Ye script sirf STATISTICAL fairness metrics compute karta hai (approval-rate
difference, disparate impact ratio). Isse hum decide karte hain ki kaunsi
groups "fairness proof" ke liye ZK circuit mein encode karni hain — actual ZK
fairness circuit alag se banega jo sirf aggregate counts (approvals per group)
prove karega, individual records reveal kiye bina.

Standard fair-lending metrics used:
  - Approval Rate per group
  - Disparate Impact Ratio (DIR) = min_group_approval_rate / max_group_approval_rate
    (US EEOC "4/5ths rule": DIR < 0.8 is a common red-flag threshold)
  - Statistical Parity Difference (SPD) = group_approval_rate - overall_approval_rate

Usage:
    python3 fairness_check.py --csv ../data/raw/loan_data.csv
    (run from inside the training/ folder, with the training venv active)
"""

import argparse
import json
import os

import pandas as pd

DIR_THRESHOLD = 0.8  # EEOC four-fifths rule
SPD_THRESHOLD = 0.10  # 10 percentage points is a common practical flag


def compute_group_fairness(df: pd.DataFrame, group_col: str, target_col: str = "loan_status"):
    overall_rate = df[target_col].mean()
    grouped = df.groupby(group_col)[target_col].agg(["mean", "count"]).reset_index()
    grouped.columns = [group_col, "approval_rate", "count"]

    max_rate = grouped["approval_rate"].max()
    min_rate = grouped["approval_rate"].min()
    dir_ratio = (min_rate / max_rate) if max_rate > 0 else None

    results = {
        "group_column": group_col,
        "overall_approval_rate": float(overall_rate),
        "groups": [],
        "disparate_impact_ratio": float(dir_ratio) if dir_ratio is not None else None,
        "disparate_impact_flag": bool(dir_ratio is not None and dir_ratio < DIR_THRESHOLD),
    }

    for _, row in grouped.iterrows():
        spd = row["approval_rate"] - overall_rate
        results["groups"].append({
            "group": str(row[group_col]),
            "count": int(row["count"]),
            "approval_rate": float(row["approval_rate"]),
            "statistical_parity_difference": float(spd),
            "spd_flag": bool(abs(spd) > SPD_THRESHOLD),
        })

    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    args = parser.parse_args()

    df = pd.read_csv(args.csv)

    # These are exactly the fields the docs flag as fairness-relevant (Section 5.1)
    fairness_cols = ["person_gender", "person_education", "loan_intent", "person_home_ownership"]
    fairness_cols = [c for c in fairness_cols if c in df.columns]

    all_results = {}
    for col in fairness_cols:
        res = compute_group_fairness(df, col)
        all_results[col] = res

        print(f"\n=== Fairness check: {col} ===")
        print(f"Overall approval rate: {res['overall_approval_rate']:.3f}")
        for g in res["groups"]:
            flag = " ⚠️ FLAGGED" if g["spd_flag"] else ""
            print(f"  {g['group']:25s}  n={g['count']:6d}  approval={g['approval_rate']:.3f}  "
                  f"SPD={g['statistical_parity_difference']:+.3f}{flag}")
        dir_flag = " ⚠️ BELOW 0.8 (EEOC four-fifths rule)" if res["disparate_impact_flag"] else " (OK)"
        print(f"  Disparate Impact Ratio: {res['disparate_impact_ratio']:.3f}{dir_flag}")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(base_dir, "backend", "models", "fairness_report.json")
    with open(out_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nFull fairness report saved to {out_path}")


if __name__ == "__main__":
    main()
