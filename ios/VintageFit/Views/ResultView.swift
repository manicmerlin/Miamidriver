import SwiftUI

struct ResultView: View {
    let response: IngestResponse
    let onReset: () -> Void

    var body: some View {
        List {
            Section("Fit profile") {
                FieldRow(label: "Brand", value: response.profile.brand)
                FieldRow(label: "Line / collection", value: response.profile.line)
                FieldRow(label: "Era", value: response.profile.eraLabel)
                FieldRow(label: "Garment", value: response.profile.garmentType.rawValue)
                FieldRow(label: "Size", value: response.profile.sizeLabel)
                FieldRow(label: "Country of origin", value: response.profile.countryOfOrigin)
                FieldRow(label: "Fabric", value: response.profile.fabricContent)
            }

            if let inference = response.eraInference, !inference.signals.isEmpty {
                Section("Why this era") {
                    ForEach(inference.signals) { s in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(s.observation).font(.footnote)
                            Text("→ \(s.labelPushed) · weight \(s.weight, specifier: "%.1f")")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            if !response.canonicalMeasurements.isEmpty {
                Section("Canonical measurements (sizing KB)") {
                    ForEach(response.canonicalMeasurements) { m in
                        HStack {
                            Text(m.name.capitalized)
                            Spacer()
                            Text("\(m.value, specifier: "%.1f") \(m.unit)")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            if !response.profile.measurements.isEmpty {
                Section("Seller-stated measurements") {
                    ForEach(response.profile.measurements) { m in
                        HStack {
                            Text(m.name.capitalized)
                            Spacer()
                            Text("\(m.value, specifier: "%.1f") \(m.unit)")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            if let feat = response.photoFeatures, hasAnyField(feat) {
                Section("Photo observations") {
                    if let v = feat.collarStyle { LabeledField(label: "Collar", value: v) }
                    if let v = feat.buttonStyle { LabeledField(label: "Buttons", value: v) }
                    if let v = feat.fabricPattern { LabeledField(label: "Fabric", value: v) }
                    if let v = feat.fitSilhouette { LabeledField(label: "Silhouette", value: v) }
                    if let v = feat.labelAging { LabeledField(label: "Label aging", value: v) }
                }
            }

            Section("Other collections that should fit similarly") {
                CrossMatchesView(matches: response.crossMatches, sourceCanonical: response.canonicalMeasurements)
            }

            ForEach(response.queries) { q in
                Section(header: Text(q.marketplace.rawValue.capitalized)) {
                    SearchTermsView(query: q)
                }
            }
        }
        .navigationTitle("Results")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("New", action: onReset)
            }
        }
    }
}

private struct FieldRow: View {
    let label: String
    let value: String?

    var body: some View {
        HStack(alignment: .top) {
            Text(label).foregroundStyle(.secondary)
            Spacer()
            Text(value ?? "—")
                .multilineTextAlignment(.trailing)
        }
    }
}

private struct LabeledField: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Text(label).foregroundStyle(.secondary)
            Spacer()
            Text(value).multilineTextAlignment(.trailing)
        }
    }
}

private func hasAnyField(_ f: PhotoFeatures) -> Bool {
    f.collarStyle != nil ||
    f.buttonStyle != nil ||
    f.fabricPattern != nil ||
    f.fitSilhouette != nil ||
    f.labelAging != nil
}
