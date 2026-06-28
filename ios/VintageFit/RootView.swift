import SwiftUI

struct RootView: View {
    @EnvironmentObject var api: APIClient
    @EnvironmentObject var settings: AppSettings
    @EnvironmentObject var store: LocalStore

    @State private var ingest: IngestResponse?
    @State private var isWorking = false
    @State private var error: String?
    @State private var showSettings = false
    @State private var showHistory = false

    var body: some View {
        NavigationStack {
            Group {
                if let ingest {
                    ResultView(response: ingest, onReset: { self.ingest = nil })
                } else {
                    CaptureView(
                        isWorking: $isWorking,
                        error: $error,
                        onURL: handleURL,
                        onImage: handleImage
                    )
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showHistory = true } label: { Image(systemName: "clock.arrow.circlepath") }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: { Image(systemName: "gearshape") }
                }
            }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .sheet(isPresented: $showHistory) {
                HistoryView(onPick: { profile in
                    showHistory = false
                    Task { await reingest(profile: profile) }
                })
            }
        }
    }

    private func handleURL(_ url: String, notes: String?) {
        Task { await run { try await fetchIngest(url: url, image: nil, notes: notes) } }
    }

    private func handleImage(_ data: Data, notes: String?) {
        Task { await run { try await fetchIngest(url: nil, image: data, notes: notes) } }
    }

    private func reingest(profile: FitProfile) async {
        // Re-present a previously-saved profile without re-running ingest.
        // Build a minimal IngestResponse from local data.
        ingest = IngestResponse(
            source: SourceGarment(
                sourceKind: "manual", sourceUrl: nil, marketplace: .unknown,
                title: nil, description: nil, brand: nil, line: nil, size: nil,
                countryOfOrigin: nil, fabricContent: nil,
                measurements: profile.measurements,
                rawSellerSizeLabel: profile.sizeLabel),
            profile: profile,
            queries: [],
            eraInference: nil,
            canonicalMeasurements: profile.measurements,
            canonicalTier: nil,
            canonicalCitations: [],
            photoFeatures: nil,
            crossMatches: settings.useMockBackend
                ? MockBackend.findMore(profileId: profile.id, learnedBoosts: store.learnedBoosts)
                : []
        )
    }

    private func fetchIngest(url: String?, image: Data?, notes: String?) async throws -> IngestResponse {
        if settings.useMockBackend {
            // Simulate latency so the spinner is visible.
            try await Task.sleep(nanoseconds: 400_000_000)
            return MockBackend.ingest(url: url, imageData: image, notes: notes)
        }
        return try await api.ingest(url: url, imageData: image, notes: notes)
    }

    private func run(_ block: @escaping () async throws -> IngestResponse) async {
        isWorking = true
        error = nil
        defer { isWorking = false }
        do {
            let response = try await block()
            store.saveProfile(response.profile)
            ingest = response
        } catch {
            self.error = String(describing: error)
        }
    }
}
