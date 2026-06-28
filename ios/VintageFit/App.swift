import SwiftUI

@main
struct VintageFitApp: App {
    @StateObject private var settings = AppSettings()
    @StateObject private var store = LocalStore()
    @StateObject private var api: APIClient

    init() {
        let s = AppSettings()
        _settings = StateObject(wrappedValue: s)
        _api = StateObject(wrappedValue: APIClient(baseURL: s.backendURL))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(settings)
                .environmentObject(store)
                .environmentObject(api)
                .onChange(of: settings.backendURLString) { _, _ in
                    api.baseURL = settings.backendURL
                }
        }
    }
}
