import SwiftUI

struct HistoryView: View {
    @EnvironmentObject var store: LocalStore
    var onPick: (FitProfile) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if store.profiles.isEmpty {
                    Text("Profiles you ingest will show up here.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(store.profiles) { profile in
                        Button {
                            onPick(profile)
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(profile.brand ?? "Unknown brand").font(.body.bold())
                                Text([profile.line, profile.eraLabel, profile.sizeLabel]
                                    .compactMap { $0 }.joined(separator: " · "))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    .onDelete { idxs in
                        for i in idxs {
                            store.deleteProfile(id: store.profiles[i].id)
                        }
                    }
                }
                if !store.learnedBoosts.isEmpty {
                    Section("Similar-fit memory") {
                        ForEach(store.learnedBoosts.sorted(by: { $0.value > $1.value }), id: \.key) { key, weight in
                            HStack {
                                Text(key.replacingOccurrences(of: "|", with: " · "))
                                    .font(.caption)
                                    .lineLimit(2)
                                Spacer()
                                Text("\(weight, specifier: "%.0f")×")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("History")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
