import SwiftUI

struct SearchTermsView: View {
    let query: MarketplaceQuery

    var body: some View {
        ForEach(Array(query.queries.enumerated()), id: \.offset) { _, term in
            HStack {
                Text(term).lineLimit(2)
                Spacer()
                Button {
                    UIPasteboard.general.string = term
                } label: {
                    Image(systemName: "doc.on.doc")
                }
                .buttonStyle(.borderless)
            }
        }
        if let deepLink = query.deepLink {
            Link(destination: deepLink) {
                HStack {
                    Image(systemName: "arrow.up.right.square")
                    Text("Open top query on \(query.marketplace.rawValue.capitalized)")
                }
            }
        }
        if !query.tips.isEmpty {
            ForEach(query.tips, id: \.self) { tip in
                Text(tip)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
