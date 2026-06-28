from app.ingestion._common import parse_measurements


def test_pit_to_pit_inches():
    m = parse_measurements("Pit to pit: 22\" / length 30 in")
    by_name = {x.name: x for x in m}
    assert by_name["chest"].value == 22
    assert by_name["chest"].unit == "in"
    assert by_name["length"].value == 30


def test_cm_unit_preserved():
    m = parse_measurements("Chest 56 cm, sleeve 64 cm")
    by_name = {x.name: x for x in m}
    assert by_name["chest"].unit == "cm"
    assert by_name["sleeve"].value == 64


def test_garbage_values_ignored():
    # Phone number-ish or zero-like values should not surface.
    m = parse_measurements("call 305 555 0123 for measurements, sleeve 0.5 in")
    assert all(x.name != "sleeve" for x in m)


def test_handles_none():
    assert parse_measurements(None) == []
    assert parse_measurements("") == []
