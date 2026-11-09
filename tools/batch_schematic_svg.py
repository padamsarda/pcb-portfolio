"""Batch consecutive KiCad SVG strokes without changing path coordinates."""
from itertools import groupby
from xml.etree import ElementTree as ET

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)


def batch_schematic_svg(data):
    root = ET.fromstring(data)

    def batch_group(element, inherited):
        style = dict(inherited)
        for declaration in element.get("style", "").split(";"):
            key, sep, value = declaration.partition(":")
            if sep:
                style[key.strip()] = value.strip()
        for key in ("fill", "stroke", "stroke-opacity", "opacity"):
            if key in element.attrib:
                style[key] = element.attrib[key]

        children = list(element)
        for child in children:
            if len(child):
                batch_group(child, style)

        if (style.get("fill") != "none" or style.get("stroke") in (None, "none")
                or float(style.get("stroke-opacity", "1")) != 1
                or float(style.get("opacity", "1")) != 1):
            return

        def can_batch(child):
            return (child.tag == f"{{{SVG}}}path" and child.attrib.keys() == {"d"}
                    and child.attrib["d"].lstrip().startswith("M"))

        result = []
        for eligible, run in groupby(children, can_batch):
            paths = list(run)
            if not eligible:
                result.extend(paths)
                continue
            # Keep paths small so the browser can cull offscreen artwork.
            for start in range(0, len(paths), 128):
                batch = paths[start:start + 128]
                first = batch[0]
                if len(batch) > 1:
                    first.set("d", " ".join(path.attrib["d"].strip() for path in batch))
                    first.tail = batch[-1].tail
                result.append(first)
        element[:] = result

    batch_group(root, {})
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)
