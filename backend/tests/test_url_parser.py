from app.ingestion import detect_marketplace
from app.schemas import Marketplace


def test_depop():
    assert detect_marketplace("https://www.depop.com/products/abc123") == Marketplace.depop
    assert detect_marketplace("https://depop.com/products/abc") == Marketplace.depop


def test_ebay():
    assert detect_marketplace("https://www.ebay.com/itm/12345") == Marketplace.ebay
    assert detect_marketplace("https://www.ebay.co.uk/itm/12345") == Marketplace.ebay


def test_mercari():
    assert detect_marketplace("https://www.mercari.com/us/item/x") == Marketplace.mercari


def test_poshmark():
    assert detect_marketplace("https://poshmark.com/listing/abc") == Marketplace.poshmark


def test_grailed():
    assert detect_marketplace("https://www.grailed.com/listings/123") == Marketplace.grailed


def test_unknown():
    assert detect_marketplace("https://example.com/foo") == Marketplace.unknown
