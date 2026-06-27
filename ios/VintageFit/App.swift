import SwiftUI

@main
struct VintageFitApp: App {
    @StateObject private var api = APIClient(baseURL: URL(string: "http://localhost:8000")!)

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(api)
        }
    }
}
