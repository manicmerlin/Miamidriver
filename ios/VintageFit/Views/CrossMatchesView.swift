import SwiftUI

struct CrossMatchesView: View {
    let matches: [CrossMatchCandidate]
    let sourceCanonical: [Measurement]

    var body: some View {
        if matches.isEmpty {
            Text("No cross-collection matches in the knowledge base yet.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        } else {
            ForEach(matches) { m in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("\(m.entry.brand) — \(m.entry.line)")
                                .font(.body.bold())
                            Text("\(m.entry.eraLabel) · size \(m.entry.sizeLabel)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(String(format: "%.2f", m.distance))
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.tertiary)
                    }
                    if !m.deltaInches.isEmpty {
                        Text(deltaSummary(m.deltaInches))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    if let query = m.query, let top = query.queries.first {
                        HStack {
                            Text(top).lineLimit(1).font(.footnote)
                            Spacer()
                            Button {
                                UIPasteboard.general.string = top
                            } label: {
                                Image(systemName: "doc.on.doc")
                            }
                            .buttonStyle(.borderless)
                            if let deep = query.deepLink {
                                Link(destination: deep) {
                                    Image(systemName: "arrow.up.right.square")
                                }
                            }
                        }
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    private func deltaSummary(_ deltas: [String: Double]) -> String {
        deltas
            .sorted(by: { $0.key < $1.key })
            .map { "\($0.key) \($1 >= 0 ? "+" : "")\(String(format: "%.1f", $1))\"" }
            .joined(separator: " · ")
    }
}
