import SwiftUI

struct CrossMatchesView: View {
    let sourceProfileID: String
    let matches: [CrossMatchCandidate]

    @EnvironmentObject var store: LocalStore
    @EnvironmentObject var settings: AppSettings
    @EnvironmentObject var api: APIClient

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
                        HStack(spacing: 8) {
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
                            Button {
                                reinforce(match: m)
                            } label: {
                                Image(systemName: "heart")
                            }
                            .buttonStyle(.borderless)
                        }
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    private func reinforce(match: CrossMatchCandidate) {
        let targetKey = store.chartKey(brand: match.entry.brand, line: match.entry.line,
                                       era: match.entry.eraLabel, size: match.entry.sizeLabel)
        if let profile = store.profiles.first(where: { $0.id == sourceProfileID }) {
            store.recordFindMore(sourceProfile: profile, target: match)
        }
        if !settings.useMockBackend {
            Task {
                try? await api.learn(sourceProfileID: sourceProfileID, targetChartKey: targetKey)
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
