#!/usr/bin/env python3
"""Map SMACKIN' WIP.xlsx onto recipes.js.

Approved Recipes column H is grams of seasoning per 1 lb of seed.
lbs per 100 lb batch = grams * 100 / 453.6.

RECIPE-INGREDIENTS LIST seasoning is per 50 lb of seed (double it for a
100 lb batch). Malt "1 LB" on that sheet is 2 lb per 100 lb batch.

This script only prints a JSON patch. It does not write recipes.js.
Blank seas_lbs values are filled by scripts/apply-wip-recipes.js.
A seasoning or malt amount that already has a number is never a fill.
"""
import json
import re
import sys

import openpyxl

G_PER_LB = 453.6
DIFF_LB = 0.3

# Normalized Approved Recipes flavor -> RECIPES key.
# Exact match only. Unlisted flavors stay off the production list.
ALIASES = {
    "nashvillehot": "nashvillehot",
    "mexicanstreetcorn": "mexicanstreetcorn",
    "birthdaycake": "birthdaycake",
    "cheddarsourcream": "cheddarsourcream",
    "bbq": "backyardbbq",
    "baconmaccheese": "baconmaccheese",
    "blueberrypie": "blueberrypie",
    "chilicheesedog": "chilicheesedog",
    "funnelcake": "funnelcake",
    "sweetthaichili": "sweetthaichili",
    "honeybbq": "honeybbq",
    "chipotleranch": "chipotleranch",
    "friedchicken": "friedchicken",
    "koreanbbq": "koreanbbq",
    "dillranch": "dillranchgoodgood",
    "ranch": "ranch",
    "walkingtaco": "loadednacho",
    "honeymustard": "honeymustardkonnorgriffin",
    "strawberrycheesecake": "strawberrycheesecake",
    "dijonranch": "dijonranch",
    "jalapenoranch": "jalapenoranch",
    "dillpickle": "dillpickle",
    "garlicparmesan": "garlicparmesan",
    "crackedpepper": "crackedpepper",
    "smores": "smores",
    "teriyaki": "teriyaki",
    "buffaloranch": "buffaloranch",
    "frenchonion": "frenchonionsoup",
}

# Deliberately not aliased. Listed so a later edit does not "fix" them.
# Texas Beef Brisket is not Smoked Brisket.
# Parmesan Buffalo is not Parmuffalo.
# Grilled Marinated Streak Combo is not Flame Grilled Steak (L49 stays blank).
# JL x Smackin Teriyaki is not Teriyaki.
# Cinnamon Sugar is not Cinnamon Roll.
# Maple Bacon is not Maple Brown Sugar.
# Chicken Bacon Ranch is not Ranch.
# BBQ Chili is not Backyard BBQ.
NOT_ALIASED = [
    "cottoncandy",
    "bbqchili",
    "baconjalapenopopper",
    "texasbeefbrisket",
    "pepperedbacon",
    "hatchchili",
    "maplebacon",
    "cinnamonsugar",
    "chickenbaconranch",
    "glazeddonut",
    "chickenfriedrice",
    "tzatziki",
    "grilledmarinatedstreakcombo",
    "asianzing",
    "snickerdoodle",
    "dutchapplepie",
    "beerbrats",
    "beercheese",
    "campbellschickennoodlesoup",
    "everything",
    "parmesanbuffalo",
    "jlxsmackinpeppered",
    "jlxsmackintariyaki",
]

# RECIPE-INGREDIENTS LIST row -> RECIPES key. Seasoning there is per 50 lb.
ING_BY_CODE = {
    "S02": "cinnamonchurro",
    "S03": "backyardbbq",
    "S04": "garlicparmesan",
    "S05": "dillpickle",
    "S06": "crackedpepper",
    "S07": "cheddarjalapeno",
    "S08": "ranch",
    "S09": "maplebrownsugar",
    "S10": "lemonpepper",
    "S010": "lemonpepper",
    "S11": "sourcreamonion",
    "S011": "sourcreamonion",
}
ING_BY_NAME = {
    "le ana bruni teriyaki": "teriyaki",
    "le taco": "taco",
    "le salsa": "salsa",
    "le guacamole": "guacamole",
    "le honey sriracha": "honeysriracha",
    "le cinnamon roll": "cinnamonroll",
    "le pumpkin spice": "pumpkinspice",
    "le chili lime": "chilelimon",
    "le buffalo ranch": "buffaloranch",
    "le cheese burger": "cheeseburger",
    "le pizza": "pizza",
    "le dijon ranch": "dijonranch",
    "le ketchup": "ketchup",
    "le cheddar ghost pepper": "chedderghostpepper",
    "le loaded baked paotato": "loadedpotato",
    "le peanut butter & jelly": "peanutbutterjelly",
    "le strawberry cheesecake": "strawberrycheesecake",
    "le parmuffalo - create": "parmuffalo",
    "le parmuffalo": "parmuffalo",
}

STOP = {"seasoning", "snack", "style", "type", "upgrade"}


def r2(n):
    return float(f"{float(n):.2f}")


def lbs_from_g(g):
    return r2(float(g) * 100.0 / G_PER_LB)


def sample_num(sample):
    m = re.search(r"(\d+)", str(sample or ""))
    return int(m.group(1)) if m else 0


def norm_flavor(name):
    s = str(name or "").lower().replace("&", " and ").replace("'", "")
    s = re.sub(r"#\s*\d+", " ", s)
    s = re.sub(r"\bv\d+\b", " ", s)
    s = re.sub(r"\b\d+\s*g\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    parts = []
    for p in s.split():
        if p in STOP or p == "and":
            continue
        if re.fullmatch(r"\d+g", p):
            continue
        parts.append(p)
    return "".join(parts)


def norm_date(text):
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", str(text or ""))
    if not m:
        return ""
    year = m.group(3)
    if len(year) == 4:
        year = year[-2:]
    return f"{int(m.group(1)):02d}/{int(m.group(2)):02d}/{year}"


def parse_who(text):
    found = []
    for m in re.finditer(r"\b(Matt|Max|HQ)\b", str(text or ""), re.I):
        word = m.group(1).lower()
        if word == "matt":
            found.append("Matt")
        elif word == "max":
            found.append("Max")
        else:
            found.append("HQ")
    return found[-1] if found else ""


def cell_str(v):
    if v is None:
        return ""
    if hasattr(v, "strftime"):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    if s in ("########", "None"):
        return ""
    return s


def num_or_none(v):
    if v is None or v == "":
        return None
    if isinstance(v, str):
        t = v.strip()
        if not t or t == "########":
            return None
        try:
            return float(t)
        except ValueError:
            return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def load_approved(ws):
    rows = []
    for r in range(2, ws.max_row + 1):
        sample = cell_str(ws.cell(r, 1).value)
        flavor = cell_str(ws.cell(r, 4).value)
        if not sample and not flavor:
            continue
        grams = num_or_none(ws.cell(r, 8).value)
        seed_cell = ws.cell(r, 7).value
        seed_num = None
        seed_text = cell_str(seed_cell)
        if isinstance(seed_cell, (int, float)) or (seed_text and re.fullmatch(r"\d+(\.\d+)?", seed_text)):
            seed_num = num_or_none(seed_cell)
            seed_text = ""
        approval = cell_str(ws.cell(r, 12).value)
        rows.append({
            "sample": sample,
            "flavor": flavor,
            "norm": norm_flavor(flavor),
            "house": cell_str(ws.cell(r, 5).value),
            "vendor_item": cell_str(ws.cell(r, 6).value),
            "seed_text": seed_text,
            "seed_num": seed_num,
            "grams": grams,
            "approval": approval,
            "approved_by": parse_who(approval),
            "approved_date": norm_date(approval),
            "n": sample_num(sample),
        })
    return rows


def load_ingredients(ws):
    out = {}
    for r in range(2, ws.max_row + 1):
        flavor = cell_str(ws.cell(r, 1).value)
        if not flavor:
            continue
        code_m = re.match(r"(S\d+)", flavor.replace(" ", ""))
        key = None
        if code_m and code_m.group(1) in ING_BY_CODE:
            key = ING_BY_CODE[code_m.group(1)]
        else:
            key = ING_BY_NAME.get(flavor.strip().lower())
        if not key:
            continue
        seas50 = num_or_none(ws.cell(r, 3).value)
        malt = cell_str(ws.cell(r, 4).value)
        slot = out.setdefault(key, {"seas50": None, "malt_1lb": False, "row": flavor})
        if seas50 is not None and seas50 > 0 and slot["seas50"] is None:
            slot["seas50"] = seas50
        if re.search(r"1\s*LB", malt, re.I):
            slot["malt_1lb"] = True
    return out


def pick_latest(rows):
    return sorted(rows, key=lambda row: row["n"])[-1]


def strip_empty(obj):
    clean = {}
    for k, v in obj.items():
        if v is None or v == "":
            continue
        clean[k] = v
    return clean


def build(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    approved = load_approved(wb["Approved Recipes"])
    ingredients = load_ingredients(wb["RECIPE-INGREDIENTS LIST"])
    groups = {}
    for row in approved:
        groups.setdefault(row["norm"], []).append(row)

    recipes = {}
    missing = []
    report = []
    seen_norms = set()
    for norm, rows in sorted(groups.items(), key=lambda kv: pick_latest(kv[1])["n"]):
        chosen = pick_latest(rows)
        seen_norms.add(norm)
        earlier = []
        for row in rows:
            if row["sample"] == chosen["sample"]:
                continue
            if row["grams"] is None:
                earlier.append(row["sample"])
            else:
                g = int(row["grams"]) if float(row["grams"]).is_integer() else row["grams"]
                earlier.append(row["sample"] + " at " + str(g) + " g")
        target = ALIASES.get(norm)
        lbs = lbs_from_g(chosen["grams"]) if chosen["grams"] is not None else None
        fields = strip_empty({
            "approved_sample": chosen["sample"],
            "flavor_house": chosen["house"],
            "vendor_item": chosen["vendor_item"],
            "approved_by": chosen["approved_by"],
            "approved_date": chosen["approved_date"],
            "approved_text": chosen["approval"],
            "wip_sheet_flavor": chosen["flavor"],
            "wip_g_per_lb": chosen["grams"],
            "wip_lbs_per_batch": lbs,
            "wip_rate_from": "Approved Recipes" if lbs is not None else "",
            "wip_seed_cell": chosen["seed_num"],
        })
        if target:
            recipes[target] = {"fields": fields, "fill_from_approved": lbs is not None, "earlier": earlier, "norm": norm}
            report.append(("MAP", norm, target, chosen["sample"], chosen["flavor"], lbs, earlier))
        else:
            missing.append(strip_empty({
                "name": chosen["flavor"],
                "norm": norm,
                "approved_sample": chosen["sample"],
                "flavor_house": chosen["house"],
                "vendor_item": chosen["vendor_item"],
                "approved_by": chosen["approved_by"],
                "approved_date": chosen["approved_date"],
                "approved_text": chosen["approval"],
                "wip_g_per_lb": chosen["grams"],
                "wip_lbs_per_batch": lbs,
                "earlier": ", ".join(earlier),
            }))
            report.append(("MISS", norm, "", chosen["sample"], chosen["flavor"], lbs, earlier))

    for key, ing in ingredients.items():
        slot = recipes.setdefault(key, {"fields": {}, "fill_from_approved": False, "earlier": [], "norm": ""})
        fields = slot["fields"]
        if ing["seas50"] is not None:
            ing_lbs = r2(ing["seas50"] * 2)
            fields["wip_ing_lbs_per_batch"] = ing_lbs
            if fields.get("wip_lbs_per_batch") is None:
                fields["wip_lbs_per_batch"] = ing_lbs
                fields["wip_rate_from"] = "RECIPE-INGREDIENTS LIST"
        if ing["malt_1lb"]:
            fields["wip_malt_lbs"] = 2

    unknown = sorted(n for n in seen_norms if n not in ALIASES and n not in NOT_ALIASED)
    return {"recipes": recipes, "missing": missing, "report": report, "unknown_norms": unknown}


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/wip.xlsx"
    out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/wip-recipe-patch.json"
    built = build(path)
    payload = {"recipes": built["recipes"], "missing": built["missing"], "diff_lb": DIFF_LB}
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)
        fh.write("\n")
    print("patch", out)
    print("--- map ---")
    for kind, norm, target, sample, flavor, lbs, earlier in built["report"]:
        extra = (" earlier " + "; ".join(earlier)) if earlier else ""
        print(f"{kind}\t{norm}\t{target}\t{sample}\t{lbs}\t{flavor}{extra}")
    if built["unknown_norms"]:
        print("UNKNOWN NORMS (not in ALIASES or NOT_ALIASED):")
        for n in built["unknown_norms"]:
            print(" ", n)
        sys.exit(2)


if __name__ == "__main__":
    main()
