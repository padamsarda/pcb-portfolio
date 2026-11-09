"""Batch KiCad GLBs by mesh, material, and draw mode without changing geometry."""
import json
import struct
from array import array
from collections import defaultdict


def batch_board_glb(data):
    json_size = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20:20 + json_size])
    source = memoryview(data)[28 + json_size:]
    old_accessors = doc["accessors"]
    old_views = doc["bufferViews"]
    binary = bytearray()
    accessors = []
    views = []
    shared_accessors = {}

    def read(index):
        accessor = old_accessors[index]
        view = old_views[accessor["bufferView"]]
        start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        size = {"VEC3": 12, "SCALAR": 2 if accessor["componentType"] == 5123 else 4}[accessor["type"]]
        if view.get("byteStride", size) != size:
            raise ValueError("Expected tightly packed KiCad geometry")
        return source[start:start + accessor["count"] * size]

    def write(raw, kind, component, count, **bounds):
        key = (kind, component, count, tuple(bounds.get("min", ())),
               tuple(bounds.get("max", ())), bytes(raw))
        if key in shared_accessors:
            return shared_accessors[key]
        binary.extend(b"\0" * (-len(binary) % 4))
        views.append(dict(buffer=0, byteOffset=len(binary), byteLength=len(raw)))
        binary.extend(raw)
        accessors.append(dict(bufferView=len(views) - 1, type=kind, componentType=component,
                              count=count, **bounds))
        index = len(accessors) - 1
        shared_accessors[key] = index
        return index

    for mesh in doc["meshes"]:
        batches = defaultdict(list)
        for primitive in mesh["primitives"]:
            batches[(primitive.get("material"), primitive.get("mode", 4),
                     tuple(sorted(primitive["attributes"])))].append(primitive)
        merged = []
        for (material, mode, names), group in batches.items():
            # Leave each KiCad layer in its original mesh so it can still
            # be identified and hidden independently from the opposite face.
            attributes = {name: bytearray() for name in names}
            indices = array("I")
            bounds = [old_accessors[p["attributes"]["POSITION"]] for p in group]
            vertices = 0
            for primitive, position in zip(group, bounds):
                original_indices = array("H" if old_accessors[primitive["indices"]]["componentType"] == 5123 else "I")
                original_indices.frombytes(read(primitive["indices"]))
                indices.extend(index + vertices for index in original_indices)
                for name, accessor in primitive["attributes"].items():
                    attributes[name].extend(read(accessor))
                vertices += position["count"]
            narrow = vertices <= 65536
            raw_indices = array("H", indices).tobytes() if narrow else indices.tobytes()
            output = dict(mode=mode, indices=write(raw_indices, "SCALAR", 5123 if narrow else 5125, len(indices)),
                          attributes={})
            if material is not None:
                output["material"] = material
            for name, raw in attributes.items():
                limits = {}
                if name == "POSITION":
                    limits = {key: [op(p[key][axis] for p in bounds) for axis in range(3)]
                              for key, op in (("min", min), ("max", max))}
                output["attributes"][name] = write(raw, "VEC3", 5126, vertices, **limits)
            merged.append(output)
        mesh["primitives"] = merged

    binary.extend(b"\0" * (-len(binary) % 4))
    doc.update(accessors=accessors, bufferViews=views, buffers=[dict(byteLength=len(binary))])
    encoded = json.dumps(doc, separators=(",", ":")).encode()
    encoded += b" " * (-len(encoded) % 4)
    return (struct.pack("<4sII", b"glTF", 2, 28 + len(encoded) + len(binary))
            + struct.pack("<I4s", len(encoded), b"JSON") + encoded
            + struct.pack("<I4s", len(binary), b"BIN\0") + binary)
