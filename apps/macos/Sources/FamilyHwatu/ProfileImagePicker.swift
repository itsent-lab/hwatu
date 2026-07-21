import AppKit
import Foundation
import UniformTypeIdentifiers

@MainActor
enum ProfileImagePicker {
    static func selectJPEG() -> Data? {
        let panel = NSOpenPanel()
        panel.title = "프로필 사진 선택"
        panel.prompt = "사진 선택"
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.allowedContentTypes = [.image]
        guard panel.runModal() == .OK,
              let url = panel.url,
              let image = NSImage(contentsOf: url),
              let data = jpegData(from: image) else { return nil }
        return data
    }

    private static func jpegData(from image: NSImage) -> Data? {
        let targetMax: CGFloat = 1_024
        let ratio = min(1, targetMax / max(image.size.width, image.size.height))
        let size = NSSize(width: max(1, image.size.width * ratio), height: max(1, image.size.height * ratio))
        let output = NSImage(size: size)
        output.lockFocus()
        image.draw(in: NSRect(origin: .zero, size: size))
        output.unlockFocus()
        guard let tiff = output.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiff) else { return nil }
        return bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.78])
    }
}
