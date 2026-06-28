import Foundation
import SwiftUI

/// User-configurable runtime settings persisted to UserDefaults.
@MainActor
final class AppSettings: ObservableObject {
    @AppStorage("backendURL") var backendURLString: String = "http://localhost:8000"
    @AppStorage("useMockBackend") var useMockBackend: Bool = true

    var backendURL: URL {
        URL(string: backendURLString) ?? URL(string: "http://localhost:8000")!
    }
}
