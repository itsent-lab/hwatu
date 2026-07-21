import SwiftUI
import AppKit

final class FamilyHwatuAppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

@main
struct FamilyHwatuApp: App {
    @NSApplicationDelegateAdaptor(FamilyHwatuAppDelegate.self) private var appDelegate
    @StateObject private var appState = AppState()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup("가족 화투") {
            RootView()
                .environmentObject(appState)
                .frame(minWidth: 760, minHeight: 620)
                .preferredColorScheme(.light)
                .onChange(of: scenePhase) { _, phase in
                    if phase != .active { NativeGameSound.suspend() }
                }
        }
        .defaultSize(width: 1280, height: 720)
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .appSettings) {
                if appState.serverSettingsEnabled {
                    Button("서버 설정…") { appState.isServerSettingsPresented = true }
                        .keyboardShortcut(",")
                }
            }
        }
    }
}
