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

            if !response.profile.measurements.isEmpty {
                Section("Measurements") {
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
