import PhotosUI
import SwiftUI

struct CaptureView: View {
    @Binding var isWorking: Bool
    @Binding var error: String?

    var onURL: (String, String?) -> Void
    var onImage: (Data, String?) -> Void

    @State private var url: String = ""
    @State private var notes: String = ""
    @State private var pickerItem: PhotosPickerItem?

    var body: some View {
        Form {
            Section("Paste a marketplace listing URL") {
                TextField("https://www.depop.com/products/...", text: $url)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                    .disableAutocorrection(true)
                Button {
                    onURL(url, notes.isEmpty ? nil : notes)
                } label: {
                    HStack {
                        Image(systemName: "link")
                        Text("Extract fit profile from URL")
                    }
                }
                .disabled(url.isEmpty || isWorking)
            }

            Section("Or photograph a tag") {
                PhotosPicker(selection: $pickerItem, matching: .images) {
                    HStack {
                        Image(systemName: "camera")
                        Text("Pick a tag photo")
                    }
                }
                .onChange(of: pickerItem) { _, newValue in
                    guard let newValue else { return }
                    Task {
                        if let data = try? await newValue.loadTransferable(type: Data.self) {
                            onImage(data, notes.isEmpty ? nil : notes)
                        }
                    }
                }
            }

            Section("Notes (optional)") {
                TextField("e.g. 'fits perfect in shoulder, slight tug at chest'", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
            }

            if let error {
                Section { Text(error).foregroundColor(.red).font(.footnote) }
            }
        }
        .navigationTitle("New Fit Profile")
        .overlay {
            if isWorking {
                ProgressView("Extracting…")
                    .padding(24)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }
}
