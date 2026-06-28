import Foundation

/// In-app mock so the app runs without a backend deployed. Returns a
/// hand-crafted Christian Dior Monsieur L Bohan-era example for any input,
/// so you can demo the full UI flow immediately after installing.
enum MockBackend {
    static func ingest(url: String?, imageData: Data?, notes: String?) -> IngestResponse {
        let measurements: [Measurement] = [
            Measurement(name: "chest", value: 23.0, unit: "in",
                        source: "size-chart:researched", confidence: .high),
            Measurement(name: "length", value: 30.5, unit: "in",
                        source: "size-chart:researched", confidence: .high),
            Measurement(name: "shoulder", value: 19.5, unit: "in",
                        source: "size-chart:researched", confidence: .high),
            Measurement(name: "sleeve", value: 25.0, unit: "in",
                        source: "size-chart:researched", confidence: .high),
        ]

        let profile = FitProfile(
            id: "mock-cdm-l-bohan",
            derivedFrom: url.map { [$0] } ?? ["tag-image"],
            brand: "Christian Dior Monsieur",
            line: "Monsieur Long-Sleeve Sport Shirt",
            eraLabel: "Marc Bohan Era (1970–1989)",
            garmentType: .shirt,
            sizeLabel: "L",
            countryOfOrigin: "France",
            fabricContent: "100% cotton",
            measurements: measurements,
            notes: notes.map { [$0] } ?? []
        )

        let source = SourceGarment(
            sourceKind: imageData != nil ? "tag_image" : "url",
            sourceUrl: url.flatMap(URL.init(string:)),
            marketplace: .depop,
            title: "Vintage Christian Dior Monsieur plaid shirt",
            description: "pit to pit 23\", length 30.5\", Made in France",
            brand: Signal(value: "Christian Dior Monsieur", confidence: .high, source: "mock"),
            line: Signal(value: "Monsieur Long-Sleeve Sport Shirt", confidence: .high, source: "mock"),
            size: Signal(value: "L", confidence: .high, source: "mock"),
            countryOfOrigin: Signal(value: "France", confidence: .high, source: "mock"),
            fabricContent: Signal(value: "100% cotton", confidence: .medium, source: "mock"),
            measurements: measurements,
            rawSellerSizeLabel: "L"
        )

        let crossMatches: [CrossMatchCandidate] = [
            makeMatch(brand: "Polo Ralph Lauren", line: "Classic Fit Oxford",
                      era: "2000s Classic Fit", size: "L", distance: 0.18,
                      deltas: ["chest": 0.0, "length": 1.5]),
            makeMatch(brand: "J.Crew", line: "Slim Untucked",
                      era: "Mickey Drexler Era (2003–2017)", size: "L", distance: 0.42,
                      deltas: ["chest": -1.0, "length": -1.5]),
            makeMatch(brand: "Brooks Brothers", line: "Madison Oxford",
                      era: "2000s–2010s Madison Cut", size: "L", distance: 0.65,
                      deltas: ["chest": -1.5, "length": 0.5]),
        ]

        let eraInference = EraInference(
            chosenEraLabel: "Marc Bohan Era (1970–1989)",
            confidence: .high,
            signals: [
                EraInferenceSignal(labelPushed: "Marc Bohan Era (1970–1989)",
                                   observation: "Country of origin matches 'Made in France'",
                                   weight: 2.5, source: "tag-marker:country"),
                EraInferenceSignal(labelPushed: "Marc Bohan Era (1970–1989)",
                                   observation: "Long-point collar consistent with late-70s",
                                   weight: 2.0, source: "photo-vision:mock"),
            ],
            alternates: ["Gianfranco Ferré Era (1989–1996)"]
        )

        return IngestResponse(
            source: source,
            profile: profile,
            queries: mockQueries(),
            eraInference: eraInference,
            canonicalMeasurements: measurements,
            canonicalTier: .researched,
            canonicalCitations: [
                "https://www.grailed.com/listings/6667122",
                "https://brickvintage.com/product/vintage-christian-dior-monsieur-shirt-size-xl/"
            ],
            photoFeatures: PhotoFeatures(
                collarStyle: "long-point",
                buttonStyle: "mother-of-pearl",
                fabricPattern: "tartan plaid",
                fitSilhouette: "boxy / classic",
                labelAging: "sun-faded edges",
                additionalNotes: ["Tag script consistent with Bohan-era Monsieur sport shirts"]
            ),
            crossMatches: crossMatches
        )
    }

    static func findMore(profileId: String, learnedBoosts: [String: Double]) -> [CrossMatchCandidate] {
        var matches = [
            makeMatch(brand: "Polo Ralph Lauren", line: "Classic Fit Oxford",
                      era: "2000s Classic Fit", size: "L", distance: 0.18,
                      deltas: ["chest": 0.0, "length": 1.5]),
            makeMatch(brand: "J.Crew", line: "Slim Untucked",
                      era: "Mickey Drexler Era (2003–2017)", size: "L", distance: 0.42,
                      deltas: ["chest": -1.0, "length": -1.5]),
            makeMatch(brand: "Brooks Brothers", line: "Madison Oxford",
                      era: "2000s–2010s Madison Cut", size: "L", distance: 0.65,
                      deltas: ["chest": -1.5, "length": 0.5]),
        ]
        for i in matches.indices {
            let m = matches[i]
            let key = chartKey(brand: m.entry.brand, line: m.entry.line,
                               era: m.entry.eraLabel, size: m.entry.sizeLabel)
            if let bonus = learnedBoosts[key] {
                let reduced = max(0, m.distance - min(0.5, 0.05 * bonus))
                matches[i] = CrossMatchCandidate(entry: m.entry, distance: reduced,
                                                 matchedMeasurements: m.matchedMeasurements,
                                                 deltaInches: m.deltaInches, query: m.query)
            }
        }
        return matches.sorted { $0.distance < $1.distance }
    }

    static func chartKey(brand: String?, line: String?, era: String?, size: String?) -> String {
        return [brand ?? "?", line ?? "?", era ?? "?", size ?? "?"]
            .map { $0.lowercased() }
            .joined(separator: "|")
    }

    private static func makeMatch(brand: String, line: String, era: String, size: String,
                                  distance: Double, deltas: [String: Double]) -> CrossMatchCandidate {
        let entry = SizeChartEntry(
            brand: brand, line: line, eraLabel: era, garmentType: .shirt,
            sizeLabel: size, measurements: [], source: "estimated:claude-baseline",
            notes: nil
        )
        let encoded = "\(brand) \(line) \(size)"
            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let query = MarketplaceQuery(
            marketplace: .depop,
            queries: ["\(brand) \(line) \(size)", "\(brand) \(size)"],
            deepLink: URL(string: "https://www.depop.com/search/?q=\(encoded)"),
            tips: ["Filter by size after the search loads."]
        )
        return CrossMatchCandidate(
            entry: entry,
            distance: distance,
            matchedMeasurements: ["chest", "length"],
            deltaInches: deltas,
            query: query
        )
    }

    private static func mockQueries() -> [MarketplaceQuery] {
        let brand = "Christian Dior Monsieur"
        let encode: (String) -> String = { $0.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "" }
        return [
            MarketplaceQuery(
                marketplace: .depop,
                queries: ["\(brand) shirt L", "vintage \(brand)", "\(brand) plaid"],
                deepLink: URL(string: "https://www.depop.com/search/?q=\(encode(brand + " shirt"))"),
                tips: ["Sort by Newest.", "Apply size filter after results load."]
            ),
            MarketplaceQuery(
                marketplace: .ebay,
                queries: ["\(brand) shirt", "vintage \(brand) shirt"],
                deepLink: URL(string: "https://www.ebay.com/sch/i.html?_nkw=\(encode(brand + " shirt"))"),
                tips: ["Apply Size filter in sidebar."]
            ),
            MarketplaceQuery(
                marketplace: .grailed,
                queries: ["\(brand) L"],
                deepLink: URL(string: "https://www.grailed.com/shop?keywords=\(encode(brand))"),
                tips: ["Use Designer filter for exact match."]
            ),
        ]
    }
}
