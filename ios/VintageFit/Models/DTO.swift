import Foundation

// Mirrors backend Pydantic models in app/schemas.py.
// Only the fields the UI cares about are decoded; unknown fields are ignored.

enum Marketplace: String, Codable {
    case depop, ebay, mercari, poshmark, grailed, vestiaire, unknown
}

enum GarmentType: String, Codable {
    case shirt, polo, tshirt, sweater, jacket, coat, pants, shorts, suit, blazer, unknown
}

enum Confidence: String, Codable {
    case high, medium, low
}

struct Signal: Codable {
    let value: String
    let confidence: Confidence
    let source: String
}

struct Measurement: Codable, Identifiable {
    let name: String
    let value: Double
    let unit: String
    let source: String
    let confidence: Confidence

    var id: String { "\(name)-\(value)\(unit)" }
}

struct SourceGarment: Codable {
    let sourceKind: String
    let sourceUrl: URL?
    let marketplace: Marketplace
    let title: String?
    let description: String?
    let brand: Signal?
    let line: Signal?
    let size: Signal?
    let countryOfOrigin: Signal?
    let fabricContent: Signal?
    let measurements: [Measurement]
    let rawSellerSizeLabel: String?

    enum CodingKeys: String, CodingKey {
        case sourceKind = "source_kind"
        case sourceUrl = "source_url"
        case marketplace, title, description, brand, line, size
        case countryOfOrigin = "country_of_origin"
        case fabricContent = "fabric_content"
        case measurements
        case rawSellerSizeLabel = "raw_seller_size_label"
    }
}

struct FitProfile: Codable, Identifiable {
    let id: String
    let derivedFrom: [String]
    let brand: String?
    let line: String?
    let eraLabel: String?
    let garmentType: GarmentType
    let sizeLabel: String?
    let countryOfOrigin: String?
    let fabricContent: String?
    let measurements: [Measurement]
    let notes: [String]

    enum CodingKeys: String, CodingKey {
        case id
        case derivedFrom = "derived_from"
        case brand, line
        case eraLabel = "era_label"
        case garmentType = "garment_type"
        case sizeLabel = "size_label"
        case countryOfOrigin = "country_of_origin"
        case fabricContent = "fabric_content"
        case measurements, notes
    }
}

struct MarketplaceQuery: Codable, Identifiable {
    let marketplace: Marketplace
    let queries: [String]
    let deepLink: URL?
    let tips: [String]

    var id: String { marketplace.rawValue }

    enum CodingKeys: String, CodingKey {
        case marketplace, queries, tips
        case deepLink = "deep_link"
    }
}

struct IngestResponse: Codable {
    let source: SourceGarment
    let profile: FitProfile
    let queries: [MarketplaceQuery]
}
