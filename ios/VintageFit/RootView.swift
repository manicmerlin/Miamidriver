import SwiftUI

struct RootView: View {
    @EnvironmentObject var api: APIClient
    @State private var ingest: IngestResponse?
    @State private var isWorking = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
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
    }

    private func handleURL(_ url: String, notes: String?) {
        Task { await run { try await api.ingest(url: url, notes: notes) } }
    }

    private func handleImage(_ data: Data, notes: String?) {
        Task { await run { try await api.ingest(imageData: data, notes: notes) } }
    }

    private func run(_ block: @escaping () async throws -> IngestResponse) async {
        isWorking = true
        error = nil
        defer { isWorking = false }
        do {
            ingest = try await block()
        } catch {
            self.error = String(describing: error)
        }
    }
}
