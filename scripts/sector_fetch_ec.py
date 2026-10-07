#!/usr/bin/env python3
"""Benchmark sectorial del Ecuador desde el Ranking Empresarial de la
Superintendencia de Compañías, Valores y Seguros (SCVS):
  https://appscvsmovil.supercias.gob.ec/ranking/reporte.html → Recursos →
  ranking_<año>.xlsx (un libro por año con el estado financiero de cada
  compañía: ingresos por ventas, utilidades, activo, patrimonio, empleados,
  actividad CIIU, provincia y tamaño).

Uso:
  python3 scripts/sector_fetch_ec.py <clave> <CIIU…> [--anio 2025] [--dir carpeta]
  python3 scripts/sector_fetch_ec.py farmacias-ecuador G4772

Descarga ranking_<año>.xlsx y ranking_<año-1>.xlsx a --dir (si no están) y
escribe src/data/sector/<clave>.json con la misma estructura que
scripts/sector-fetch.ts (Supersociedades, Colombia). Diferencias del origen:
no hay ganancia bruta ni operacional; el margen operacional se aproxima con
la utilidad antes de impuestos sobre ventas y el margen bruto queda nulo.
Cifras en USD millones."""
import json, re, sys, statistics, urllib.request, ssl, warnings
from pathlib import Path
from datetime import date
warnings.filterwarnings("ignore")
import openpyxl

args = sys.argv[1:]
anio = 2025
if "--anio" in args: i = args.index("--anio"); anio = int(args[i + 1]); del args[i:i + 2]
outdir = Path("/tmp/scvs")
if "--dir" in args: i = args.index("--dir"); outdir = Path(args[i + 1]); del args[i:i + 2]
if len(args) < 2: sys.exit(__doc__)
key, codes = args[0], [c.upper() for c in args[1:]]
outdir.mkdir(parents=True, exist_ok=True)

BASE = "https://appscvsmovil.supercias.gob.ec/ranking/recursos/archivos/ranking_%d.xlsx"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36"
def fetch(y):
    p = outdir / f"ranking_{y}.xlsx"
    if p.exists() and p.stat().st_size > 5_000_000: return p
    ctx = ssl.create_default_context()
    req = urllib.request.Request(BASE % y, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=600) as r, open(p, "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)
    return p

PROV = {"SANTO DOMINGO DE LOS TSACHILAS": "Santo Domingo de los Tsáchilas", "MANABI": "Manabí", "SUCUMBIOS": "Sucumbíos", "LOS RIOS": "Los Ríos", "BOLIVAR": "Bolívar", "CANAR": "Cañar", "GALAPAGOS": "Galápagos"}
def prov(v):
    v = (v or "").strip().upper()
    if v in PROV: return PROV[v]
    return v.title().replace(" De ", " de ").replace(" Del ", " del ")

def load(y):
    """{expediente: fila} del ranking del año y."""
    wb = openpyxl.load_workbook(fetch(y), read_only=True, data_only=True)
    ws = wb.worksheets[0]
    it = ws.iter_rows(values_only=True)
    next(it)                                   # «Fecha de corte …»
    hdr = [str(h or "").split("\n")[0].strip() for h in next(it)]
    ix = {h: i for i, h in enumerate(hdr)}
    col = lambda *names: next(ix[n] for n in names if n in ix)
    c_exp, c_nom, c_act, c_prov, c_ciu, c_tam = col("Expediente"), col("Nombre"), col("Actividad económica"), col("Provincia"), col("Ciudad"), col("Tamaño")
    c_emp, c_act_, c_pat, c_ing, c_uai, c_uej, c_une = col("Cant. Empleados"), col("Activio", "Activo"), col("Patrimonio"), col("Ingreso por ventas"), col("Utilidad antes del impuesto a la renta", "Utilidad antes del impuesto"), col("Utilidad del ejercicio"), col("Utilidad neta")
    out = {}
    for r in it:
        act = str(r[c_act] or "").strip()
        if not any(act.upper().startswith(c) for c in codes): continue
        f = lambda i: float(r[i]) if isinstance(r[i], (int, float)) else (float(str(r[i]).replace(",", "")) if str(r[i] or "").replace(".", "", 1).replace("-", "", 1).replace(",", "").isdigit() else None)
        out[str(int(float(r[c_exp])))] = {
            "name": str(r[c_nom] or "").strip(), "dept": prov(r[c_prov]), "city": str(r[c_ciu] or "").strip().title(),
            "ciiu": act[:5].upper(), "ciiuName": act.split(" - ", 1)[1].strip().capitalize() if " - " in act else act,
            "size": str(r[c_tam] or "").strip(), "employees": f(c_emp), "assets": f(c_act_), "equity": f(c_pat),
            "revenue": f(c_ing), "ebt": f(c_uai), "profit": f(c_uej), "net": f(c_une),
        }
    return out

print(f"SCVS ranking {anio} y {anio-1} · CIIU {', '.join(codes)}", file=sys.stderr)
cur, prev = load(anio), load(anio - 1)
M = 1e6
peers = []
for exp, r in cur.items():
    if not r["revenue"] or r["revenue"] <= 0: continue
    p = prev.get(exp)
    pct = lambda a, b: round(a / b * 1000) / 10 if a is not None and b else None
    peers.append({
        "nit": exp, "name": r["name"], "dept": r["dept"], "city": r["city"], "ciiu": r["ciiu"],
        "revenue": round(r["revenue"] / M, 2), "revenuePrev": round(p["revenue"] / M, 2) if p and p["revenue"] else None,
        "growth": round((r["revenue"] / p["revenue"] - 1) * 1000) / 10 if p and p["revenue"] and p["revenue"] > 0 else None,
        "grossMargin": None, "opMargin": pct(r["ebt"], r["revenue"]), "netMargin": pct(r["net"], r["revenue"]),
        "roa": pct(r["net"], r["assets"]), "assets": round(r["assets"] / M, 2) if r["assets"] else None,
        "equity": round(r["equity"] / M, 2) if r["equity"] else None,
        "leverage": pct((r["assets"] or 0) - (r["equity"] or 0), r["assets"]) if r["assets"] else None,
        "employees": r["employees"], "size": r["size"],
    })
peers.sort(key=lambda x: -x["revenue"])

def quant(xs, q):
    if not xs: return None
    s = sorted(xs); i = (len(s) - 1) * q; lo, hi = int(i // 1), min(len(s) - 1, int(i // 1) + 1)
    return round((s[lo] + (s[hi] - s[lo]) * (i - lo)) * 10) / 10
def dist(sel):
    xs = [v for v in (sel(p) for p in peers) if v is not None and abs(v) <= 500]
    return {"n": len(xs), "p10": quant(xs, .1), "p25": quant(xs, .25), "p50": quant(xs, .5), "p75": quant(xs, .75), "p90": quant(xs, .9)}
revenue = sum(p["revenue"] for p in peers)
withprev = [p for p in peers if p["revenuePrev"]]
revprev = sum(p["revenuePrev"] for p in withprev); revsame = sum(p["revenue"] for p in withprev)
share = lambda k: round(sum(p["revenue"] for p in peers[:k]) / revenue * 1000) / 10 if revenue else 0
# franjas en USD millones (sector farmacéutico ecuatoriano: muchas sociedades pequeñas)
bands = [("Hasta 1 M", 0, 1), ("1 a 5 M", 1, 5), ("5 a 25 M", 5, 25), ("Más de 25 M", 25, 1e12)]
sizes = [{"band": b, "n": sum(1 for p in peers if lo <= p["revenue"] < hi)} for b, lo, hi in bands]
bydept = {}
for p in peers:
    d = bydept.setdefault(p["dept"], {"n": 0, "revenue": 0.0}); d["n"] += 1; d["revenue"] += p["revenue"]
departments = sorted([{"name": k, "n": v["n"], "revenue": round(v["revenue"], 2), "share": round(v["revenue"] / revenue * 1000) / 10} for k, v in bydept.items()], key=lambda x: -x["revenue"])
byciiu = []
for c in sorted({p["ciiu"] for p in peers}):
    ps = [p for p in peers if p["ciiu"] == c]
    byciiu.append({"code": c, "name": next((cur[p["nit"]]["ciiuName"] for p in ps), c), "n": len(ps), "revenue": round(sum(p["revenue"] for p in ps), 2),
                   "growthP50": quant([p["growth"] for p in ps if p["growth"] is not None and abs(p["growth"]) <= 500], .5),
                   "opMarginP50": quant([p["opMargin"] for p in ps if p["opMargin"] is not None and abs(p["opMargin"]) <= 500], .5)})
band = [p for p in peers if 1 <= p["revenue"] < 100 and p["growth"] is not None and p["opMargin"] is not None and abs(p["growth"]) <= 150 and abs(p["opMargin"]) <= 60]
step = max(1, len(band) // 40)
comparables = band[::step][:40]
out = {
    "key": key, "label": byciiu[0]["name"] if len(byciiu) == 1 else "Comercio al por menor · " + ", ".join(c["code"] for c in byciiu),
    "ciiu": [{"code": c["code"], "name": c["name"]} for c in byciiu],
    "source": {
        "name": "Superintendencia de Compañías, Valores y Seguros del Ecuador · Ranking Empresarial",
        "datasets": [{"id": f"ranking_{anio}", "name": f"Ranking empresarial {anio}", "url": BASE % anio}, {"id": f"ranking_{anio-1}", "name": f"Ranking empresarial {anio-1}", "url": BASE % (anio - 1)}],
        "cut": f"{anio}-12-31", "fetchedAt": date.today().isoformat(),
        "note": "Compañías bajo control de la SCVS que presentaron estados financieros (societario y mercado de valores). No hay ganancia bruta ni operacional en el ranking: el margen operacional se aproxima con la utilidad antes de impuestos sobre ventas y el margen bruto no se calcula. Cifras en USD millones.",
    },
    "units": "USD millones", "n": len(peers),
    "totals": {"revenue": round(revenue, 2), "revenuePrev": round(revprev, 2), "growth": round((revsame / revprev - 1) * 1000) / 10 if revprev else None, "assets": round(sum(p["assets"] or 0 for p in peers), 2)},
    "dist": {"growth": dist(lambda p: p["growth"]), "grossMargin": dist(lambda p: p["grossMargin"]), "opMargin": dist(lambda p: p["opMargin"]), "netMargin": dist(lambda p: p["netMargin"]), "roa": dist(lambda p: p["roa"]), "leverage": dist(lambda p: p["leverage"]), "revenue": dist(lambda p: p["revenue"])},
    "sizes": sizes, "concentration": {"top5Share": share(5), "top10Share": share(10), "top20Share": share(20)},
    "departments": departments, "byCiiu": byciiu, "peers": peers[:60], "comparables": comparables,
}
dest = Path(__file__).resolve().parent.parent / "src/data/sector" / f"{key}.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"→ {dest}: {out['n']} compañías · ingresos USD {round(revenue):,} M · crecimiento mediano {out['dist']['growth']['p50']} % · margen (UAI) mediano {out['dist']['opMargin']['p50']} %", file=sys.stderr)
