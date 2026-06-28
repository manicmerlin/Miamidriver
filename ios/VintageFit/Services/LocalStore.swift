import Foundation

/// On-device persistence for saved fit profiles + learned similarity pairs.
/// Plain JSON files in the app's Application Support directory — simple
/// enough that we don't need SwiftData / CoreData for the v0 surface.
@MainActor
final class LocalStore: ObservableObject {
    @Published private(set) var profiles: [FitProfile] = []
    @Published private(set) var learnedBoosts: [String: Double] = [:]

    private let profilesURL: URL
    private let boostsURL: URL

    init() {
        let fm = FileManager.default
        let dir = (try? fm.url(for: .applicationSupportDirectory, in: .userDomainMask,
                               appropriateFor: nil, create: true))
            ?? fm.temporaryDirectory
        let appDir = dir.appendingPathComponent("VintageFit", isDirectory: true)
        try? fm.createDirectory(at: appDir, withIntermediateDirectories: true)
        self.profilesURL = appDir.appendingPathComponent("profiles.json")
        self.boostsURL = appDir.appendingPathComponent("boosts.json")
        load()
    }

    func saveProfile(_ profile: FitProfile) {
        var existing = profiles
        existing.removeAll { $0.id == profile.id }
        existing.insert(profile, at: 0)
        profiles = existing
        persistProfiles()
    }

    func deleteProfile(id: String) {
        profiles.removeAll { $0.id == id }
        persistProfiles()
    }

    func recordFindMore(sourceProfile: FitProfile, target: CrossMatchCandidate) {
        let targetKey = chartKey(brand: target.entry.brand, line: target.entry.line,
                                  era: target.entry.eraLabel, size: target.entry.sizeLabel)
        learnedBoosts[targetKey, default: 0] += 1.0
        persistBoosts()
    }

    func chartKey(brand: String?, line: String?, era: String?, size: String?) -> String {
        return [brand ?? "?", line ?? "?", era ?? "?", size ?? "?"]
            .map { $0.lowercased() }
            .joined(separator: "|")
    }

    private func load() {
        if let data = try? Data(contentsOf: profilesURL),
           let decoded = try? JSONDecoder().decode([FitProfile].self, from: data) {
            self.profiles = decoded
        }
        if let data = try? Data(contentsOf: boostsURL),
           let decoded = try? JSONDecoder().decode([String: Double].self, from: data) {
            self.learnedBoosts = decoded
        }
    }

    private func persistProfiles() {
        if let data = try? JSONEncoder().encode(profiles) {
            try? data.write(to: profilesURL, options: .atomic)
        }
    }

    private func persistBoosts() {
        if let data = try? JSONEncoder().encode(learnedBoosts) {
            try? data.write(to: boostsURL, options: .atomic)
        }
    }
}
