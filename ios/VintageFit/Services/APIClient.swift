import Foundation

@MainActor
final class APIClient: ObservableObject {
    @Published var baseURL: URL
    private let session: URLSession

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    func ingest(url listingURL: String? = nil, imageData: Data? = nil, notes: String?) async throws -> IngestResponse {
        let endpoint = baseURL.appendingPathComponent("v1/ingest")
        let boundary = "----vintagefit-\(UUID().uuidString)"

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = Self.makeMultipart(
            boundary: boundary,
            url: listingURL,
            notes: notes,
            imageData: imageData
        )

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "<no body>"
            throw APIError.server(status: (response as? HTTPURLResponse)?.statusCode ?? -1, body: body)
        }
        return try JSONDecoder().decode(IngestResponse.self, from: data)
    }

    func learn(sourceProfileID: String, targetChartKey: String) async throws {
        let endpoint = baseURL.appendingPathComponent("v1/learn")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload = ["source_profile_id": sourceProfileID, "target_chart_key": targetChartKey]
        request.httpBody = try JSONEncoder().encode(payload)
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.server(status: (response as? HTTPURLResponse)?.statusCode ?? -1, body: "")
        }
    }

    private static func makeMultipart(boundary: String, url: String?, notes: String?, imageData: Data?) -> Data {
        var body = Data()
        func append(_ s: String) { body.append(s.data(using: .utf8) ?? Data()) }

        if let url, !url.isEmpty {
            append("--\(boundary)\r\n")
            append("Content-Disposition: form-data; name=\"url\"\r\n\r\n")
            append(url + "\r\n")
        }
        if let notes, !notes.isEmpty {
            append("--\(boundary)\r\n")
            append("Content-Disposition: form-data; name=\"notes\"\r\n\r\n")
            append(notes + "\r\n")
        }
        if let imageData {
            append("--\(boundary)\r\n")
            append("Content-Disposition: form-data; name=\"image\"; filename=\"tag.jpg\"\r\n")
            append("Content-Type: image/jpeg\r\n\r\n")
            body.append(imageData)
            append("\r\n")
        }
        append("--\(boundary)--\r\n")
        return body
    }
}

enum APIError: Error, LocalizedError {
    case server(status: Int, body: String)

    var errorDescription: String? {
        switch self {
        case .server(let status, let body):
            return "Server error \(status): \(body)"
        }
    }
}
