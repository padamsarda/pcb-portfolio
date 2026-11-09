"""Export static portfolio assets from the local KiCad workspace."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile

import pcbnew as pcb

PROJECT = Path(__file__).resolve().parents[1]
WORKSPACE = PROJECT.parent
ASSETS = PROJECT / "public" / "boards"
CLI = Path(sys.executable).with_name("kicad-cli.exe" if os.name == "nt" else "kicad-cli")
MODELS = CLI.parent.parent / "share" / "kicad" / "3dmodels"
ENV = {**os.environ, **{f"KICAD{v}_3DMODEL_DIR": str(MODELS) for v in range(6, 11)}}


def run(*args):
    command = [str(CLI), *map(str, args)]
    try:
        return subprocess.run(command, capture_output=True, timeout=100,
                              text=True, encoding="utf-8", errors="replace", env=ENV)
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(command, 1, "", "KiCad export timed out.")


def mm(value):
    return round(pcb.ToMM(value), 4)


def pcb_source(spec):
    source = WORKSPACE / spec["source"]
    if spec["id"] != "bq24650":
        return source.with_suffix(".kicad_pcb"), source.with_suffix(".kicad_sch")
    folder = WORKSPACE / "Padam_PCBs" / "BQ24650_1U_SolarChargerBoard"
    local = PROJECT / ".sources" / "bq-recovered"
    local.mkdir(parents=True, exist_ok=True)
    for archive in sorted(folder.glob("*-backups/*.zip"), key=lambda p: p.name[-19:], reverse=True):
        with zipfile.ZipFile(archive) as backup:
            member = next((n for n in backup.namelist() if n.endswith(".kicad_pcb")), None)
            if member:
                path = local / Path(member).name
                path.write_bytes(backup.read(member))
                print(f"BQ24650 source: {archive.name} / {member}", flush=True)
                return path, next(folder.glob("*.kicad_sch"))
    return source.with_suffix(".kicad_pcb"), next(folder.glob("*.kicad_sch"))


def part(footprint, origin):
    box = footprint.GetBoundingBox(False, False)
    fields = footprint.GetFieldsText()
    extra = {name: value for name, value in fields.items()
             if re.search(r"part|mpn|lcsc|digikey|mouser|manufacturer", name, re.I) and value}
    return dict(ref=footprint.GetReference(), value=footprint.GetValue(),
                package=str(footprint.GetFPID().GetLibItemName()),
                side="back" if footprint.IsFlipped() else "front",
                box=[mm(box.GetX()-origin[0]), mm(box.GetY()-origin[1]),
                     mm(box.GetWidth()), mm(box.GetHeight())],
                dnp=footprint.IsDNP(), bom=not footprint.IsExcludedFromBOM(), fields=extra)


def board_outline(board, origin):
    outline = pcb.SHAPE_POLY_SET()
    if not board.GetBoardPolygonOutlines(outline, False):
        return ""
    def path(chain):
        pts = [chain.CPoint(i) for i in range(chain.PointCount())]
        return "M" + "L".join(f"{mm(p.x-origin[0])},{mm(p.y-origin[1])}" for p in pts) + "Z"
    return "".join(path(outline.COutline(i)) + "".join(
        path(outline.CHole(i, j)) for j in range(outline.HoleCount(i)))
        for i in range(outline.OutlineCount()))


def export_geometry(spec, board, file, folder):
    edge_box = board.GetBoardEdgesBoundingBox()
    board_box = edge_box if edge_box.GetWidth() and edge_box.GetHeight() else board.ComputeBoundingBox()
    origin = (board_box.GetX(), board_box.GetY())
    size = [mm(board_box.GetWidth()), mm(board_box.GetHeight())]
    layers = [board.GetStandardLayerName(layer) for layer in board.GetEnabledLayers().Seq()
              if pcb.IsCopperLayer(layer)]
    layers = ["F.Cu"] + sorted((l for l in layers if l.startswith("In")),
                                key=lambda l: int(l.split(".")[0][2:])) + ["B.Cu"]
    layers += ["F.Silkscreen", "B.Silkscreen", "F.Fab", "B.Fab", "F.Courtyard", "B.Courtyard", "Edge.Cuts"]
    parts = sorted((part(fp, origin) for fp in board.GetFootprints()),
                   key=lambda fp: re.sub(r"\d+", lambda m: m[0].zfill(6), fp["ref"]))
    with tempfile.TemporaryDirectory(dir=folder) as scratch:
        result = run("pcb", "export", "svg", "--mode-multi", "--page-size-mode",
                     "2" if board_box == edge_box else "1", "--layers", ",".join(layers),
                     "--drill-shape-opt", "2", "-o", scratch, file)
        if result.returncode:
            print(f"{spec['id']} PCB: {result.stderr[-450:]}", flush=True)
        plots = {}
        for layer in layers:
            match = next(Path(scratch).glob(f"*-{layer.replace('.', '_')}.svg"), None)
            if match:
                svg = match.read_text(encoding="utf-8")
                if board_box != edge_box:
                    svg = re.sub(r'viewBox="[^"]+"', f'viewBox="{mm(origin[0])} {mm(origin[1])} {size[0]} {size[1]}"', svg, count=1)
                name = f"{layer}.svg"
                (folder / name).write_text(svg, encoding="utf-8")
                plots[layer] = name
    return dict(size=size, hasOutline=bool(edge_box.GetWidth() and edge_box.GetHeight()),
                outline=board_outline(board, origin), plots=plots, parts=parts,
                copper=board.GetCopperLayerCount(), thickness=mm(board.GetDesignSettings().GetBoardThickness()))


def export_board(spec, skip_models):
    summary = {k: v for k, v in spec.items() if k != "source"}
    folder = ASSETS / spec["id"]
    folder.mkdir(parents=True, exist_ok=True)
    saved = folder / "data.json"
    if REUSE and saved.exists():
        return summarize(summary, json.loads(saved.read_text(encoding="utf-8")), folder)
    file, schematic = pcb_source(spec)
    if file.exists():
        board = pcb.LoadBoard(str(file))
        details = export_geometry(spec, board, file, folder)
        model = folder / "board.glb"
        missing = []
        if not skip_models and details["hasOutline"]:
            result = run("pcb", "export", "glb", "--force", "--subst-models", "--no-dnp",
                         "--include-pads", "--include-silkscreen", "--include-soldermask",
                         "-o", model, file)
            missing = sorted(set(re.findall(r"Could not add 3D model for ([^.]+)\.", result.stdout + result.stderr)))
            if result.returncode:
                print(f"{spec['id']} GLB: {result.stderr[-350:]}", flush=True)
        details.update(model=model.name if model.exists() else None, missingModels=missing)
    else:
        details = dict(size=[], outline="", plots={}, parts=[], copper=0, model=None, missingModels=[])
        print(f"{spec['id']}: PCB source missing", flush=True)
    sheets = []
    if schematic.exists():
        with tempfile.TemporaryDirectory(dir=folder) as scratch:
            result = run("sch", "export", "svg", "-o", scratch, schematic)
            if result.returncode:
                print(f"{spec['id']} schematic: {result.stderr[-350:]}", flush=True)
            files = sorted(Path(scratch).glob("*.svg"), key=lambda p: (p.stem != schematic.stem, p.name))
            for i, sheet in enumerate(files):
                name = f"sheet-{i+1}.svg"
                (folder / name).write_bytes(sheet.read_bytes())
                sheets.append(dict(file=name, title="Main sheet" if i == 0 else sheet.stem.removeprefix(schematic.stem + "-")))
    details["sheets"] = sheets
    print(f"{spec['id']}: {len(details['parts'])} footprints, {len(sheets)} sheets, 3D {bool(details['model'])}", flush=True)
    return summarize(summary, details, folder)


def summarize(summary, details, folder):
    plot = details["plots"].get("F.Cu")
    if details.get("hasOutline") and plot and not details.get("aligned"):
        values = re.search(r'viewBox="([^"]+)"', (folder / plot).read_text(encoding="utf-8"))
        if values:
            _, _, width, height = map(float, values[1].split())
            dx = (width - details["size"][0]) / 2
            dy = (height - details["size"][1]) / 2
            details["size"] = [width, height]
            details["outlineOffset"] = [dx, dy]
            for footprint in details["parts"]:
                footprint["box"][0] = round(footprint["box"][0] + dx, 4)
                footprint["box"][1] = round(footprint["box"][1] + dy, 4)
            details["aligned"] = True
    (folder / "data.json").write_text(json.dumps(details, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return {**summary, "size": details["size"] if details.get("hasOutline") else [],
            "copper": details["copper"], "thickness": details.get("thickness"),
            "parts": len(details["parts"])}


def main():
    global REUSE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-models", action="store_true")
    parser.add_argument("--reuse", action="store_true", help="Keep existing CAD exports and refresh the catalogue.")
    args = parser.parse_args()
    REUSE = args.reuse
    specs = json.loads((PROJECT / "tools" / "boards.json").read_text(encoding="utf-8"))
    summaries = [export_board(spec, args.skip_models) for spec in specs]
    (ASSETS / "index.json").write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
